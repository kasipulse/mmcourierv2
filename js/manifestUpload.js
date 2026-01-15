import { db } from './firebase.js';
import { collection, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Simple CSV parser
async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const rows = text.trim().split("\n");
      const headers = rows.shift().split(",");
      const data = rows.map(row => {
        const values = row.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i].trim());
        return obj;
      });
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Detect file type from filename
function detectType(name) {
  name = name.toLowerCase();
  if (name.includes("waybill")) return "waybill";
  if (name.includes("content")) return "content";
  if (name.includes("track")) return "track";
  return null;
}

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const files = document.getElementById("files").files;
  const log = document.getElementById("log");
  log.textContent = "";
  const data = { waybill: [], content: [], track: [] };
  let manifestId = "";

  for (let file of files) {
    const type = detectType(file.name);
    if (!type) continue;
    const parsed = await parseCSV(file);
    data[type] = parsed;
    if (!manifestId) manifestId = file.name.split(/[\-_]/)[0];
  }

  // Insert Waybills
  const batchW = writeBatch(db);
  for (let wb of data.waybill) {
    const docRef = doc(db, "waybills", wb.Waybill);
    batchW.set(docRef, { ...wb, manifestId, createdAt: new Date().toISOString() });
  }
  await batchW.commit();
  log.textContent += `Inserted ${data.waybill.length} waybills\n`;

  // Insert Contents
  const batchC = writeBatch(db);
  for (let c of data.content) {
    const docRef = doc(collection(db, "contents"));
    batchC.set(docRef, { ...c, manifestId });
  }
  await batchC.commit();
  log.textContent += `Inserted ${data.content.length} contents\n`;

  // Insert Tracking
  const batchT = writeBatch(db);
  for (let t of data.track) {
    const docRef = doc(collection(db, "tracking"));
    batchT.set(docRef, { ...t, manifestId });
  }
  await batchT.commit();
  log.textContent += `Inserted ${data.track.length} tracking events\n`;

  log.textContent += "✅ Upload complete!";
});
