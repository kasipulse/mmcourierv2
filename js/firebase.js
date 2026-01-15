// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVn4lqyV-I9Z1tQNKnrbHEZCvdNY1FDY4",
  authDomain: "mm-courier-software.firebaseapp.com",
  projectId: "mm-courier-software",
  storageBucket: "mm-courier-software.firebasestorage.app",
  messagingSenderId: "1088997998974",
  appId: "1:1088997998974:web:7d31deb10940ef2b4af32f",
  measurementId: "G-S9MW03EQ5C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const analytics = getAnalytics(app);

// Helper to get tenant-scoped collections
export const tenantCollection = (tenantId, colName) => {
  return collection(db, `tenants/${tenantId}/${colName}`);
};
