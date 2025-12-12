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
  apiKey: "AIzaSyBN7f6nmjr4xg3mW4e0X5E_loNVlXvmpWs",
  authDomain: "meditrack-1a325.firebaseapp.com",
  projectId: "meditrack-1a325",
  storageBucket: "meditrack-1a325.firebasestorage.app",
  messagingSenderId: "203548219971",
  appId: "1:203548219971:web:aad75f729aa5d4f1eb92f6",
  measurementId: "G-3XWDM6VHS4"
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
