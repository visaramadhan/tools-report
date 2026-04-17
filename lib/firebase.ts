import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { 
  apiKey: "AIzaSyAr_5jOVlJbewJOYuhiApC8BzTL2vqkUNY", 
  authDomain: "tools-report-32135.firebaseapp.com", 
  projectId: "tools-report-32135", 
  storageBucket: "tools-report-32135.firebasestorage.app", 
  messagingSenderId: "237787851918", 
  appId: "1:237787851918:web:47308f788dec887f442ddf", 
  measurementId: "G-XRS2YG0M0Q" 
};

// Initialize Firebase for SSR
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
