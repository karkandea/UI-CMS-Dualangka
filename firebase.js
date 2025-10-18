// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // this file already knows how to import



const firebaseConfig = {
  apiKey: "AIzaSyCuF7kTG0UcG9XaB_aWbpn1dzowU1GtGKk",
  authDomain: "dualangka.firebaseapp.com",
  projectId: "dualangka",
  storageBucket: "dualangka.firebasestorage.app",
  messagingSenderId: "576374443403",
  appId: "1:576374443403:web:65d19aec1c433853f6738e",
  measurementId: "G-9279DW3824"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app)
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

window.auth = auth;


if (import.meta.env.DEV) {
  // expose to the window for console debugging
  window.__fb = { auth, db, doc, getDoc };
}

