import { tenantCollection } from './firebase.js';
import { getDocs } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

const tenantId = sessionStorage.getItem('tenantId');
if (!tenantId) window.location.href = 'login.html';

async function loadWaybills() {
  const snapshot = await getDocs(tenantCollection(tenantId, 'waybills'));
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

// Example: call this on dashboard load
loadWaybills();
