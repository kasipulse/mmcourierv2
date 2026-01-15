import { tenantCollection } from './firebase.js';
import { setDoc, doc, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';

const tenantId = sessionStorage.getItem('tenantId');

export async function uploadCSVFiles(waybillFile, contentFile, trackFile) {
  const waybills = await parseCSV(waybillFile);
  const contents = await parseCSV(contentFile);
  const tracks = await parseCSV(trackFile);

  // Insert waybills first
  for (const w of waybills) {
    await setDoc(doc(tenantCollection(tenantId, 'waybills'), w.Waybill), { ...w });
  }

  // Insert contents
  for (const c of contents) {
    await addDoc(tenantCollection(tenantId, 'contents'), { ...c });
  }

  // Insert tracking
  for (const t of tracks) {
    await addDoc(tenantCollection(tenantId, 'tracking'), { ...t });
  }

  alert('CSV upload complete ✅');
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}
