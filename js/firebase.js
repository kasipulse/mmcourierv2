import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVn4lqyV-I9Z1tQNKnrbHEZCvdNY1FDY4",
  authDomain: "mm-courier-software.firebaseapp.com",
  projectId: "mm-courier-software",
  storageBucket: "mm-courier-software.firebasestorage.app",
  messagingSenderId: "1088997998974",
  appId: "1:1088997998974:web:7d31deb10940ef2b4af32f",
  measurementId: "G-S9MW03EQ5C"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const analytics = getAnalytics(app);

