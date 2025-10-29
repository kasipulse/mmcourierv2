const supabaseUrl = "https://lavqgvnjdjfywcjztame.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdnFndm5qZGpmeXdjanp0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjk0ODYsImV4cCI6MjA3NjgwNTQ4Nn0.kpguG-8Ap_icuh1FtF6c4k032qwIvoW6-KC_tX57644";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const importBtn = document.getElementById("importBtn");
const statusDiv = document.getElementById("importStatus");

async function parseCSV(file) {
  const text = await file.text();
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.length === headers.length)
    .map(r => {
      let obj = {};
      headers.forEach((h, i) => (obj[h] = r[i]?.trim()));
      return obj;
    });
}

async function uploadToSupabase(table, data, fileName) {
  if (!data.length) return;

  const { error } = await supabase.from(table).insert(data);
  if (error) {
    console.error("Upload failed:", error);
    statusDiv.innerHTML += `<p class='text-red-600'>❌ ${fileName} import failed: ${error.message}</p>`;
  } else {
    statusDiv.innerHTML += `<p class='text-green-600'>✅ ${fileName} imported successfully (${data.length} records)</p>`;
  }
}

importBtn.addEventListener("click", async () => {
  const waybillFile = document.getElementById("waybillFile").files[0];
  const contentFile = document.getElementById("contentFile").files[0];
  const trackingFile = document.getElementById("trackingFile").files[0];

  if (!waybillFile || !contentFile || !trackingFile) {
    alert("Please select all 3 files before importing.");
    return;
  }

  statusDiv.innerHTML = "<p>⏳ Processing files...</p>";

  const waybillData = await parseCSV(waybillFile);
  const contentData = await parseCSV(contentFile);
  const trackingData = await parseCSV(trackingFile);

  await uploadToSupabase("waybills", waybillData, "Waybill File");
  await uploadToSupabase("contents", contentData, "Content File");
  await uploadToSupabase("tracking_events", trackingData, "Tracking File");

  statusDiv.innerHTML += "<p class='mt-4 font-medium'>✅ Import complete!</p>";
});
