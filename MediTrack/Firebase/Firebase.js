// Patient_Firebase.js

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getAnalytics
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";

// --------------------------
//   Firebase Config
// --------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBuIibcaDVQITxabmh7ZkrVAp9uvCjzfw0",
  authDomain: "meditrack-5cc0c.firebaseapp.com",
  projectId: "meditrack-5cc0c",
  storageBucket: "meditrack-5cc0c.firebasestorage.app",
  messagingSenderId: "502198602638",
  appId: "1:502198602638:web:0a189d9dfba9cc17adb2df",
  measurementId: "G-D4FE4D2PJE"
};

// --------------------------
//   FIX: Prevent re-init
// --------------------------

// Check if Firebase is already initialized
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

let analytics = null;
try { analytics = getAnalytics(app); } catch (e) {}

// Auth + Persistence

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("✅ Auth persistence set to LOCAL"))
  .catch(err => console.error("Auth persistence error:", err));
// Set persistence so user stays logged in even after reload
export const db = getFirestore(app);

console.log("🔥 Firebase initialized (single instance).");
