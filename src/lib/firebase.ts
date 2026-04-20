import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "REMOVED_API_KEY",
  authDomain: "coe-awards.firebaseapp.com",
  projectId: "coe-awards",
  storageBucket: "coe-awards.firebasestorage.app",
  messagingSenderId: "REMOVED_SENDER_ID",
  appId: "1:REMOVED_SENDER_ID:web:43ed0cdd31b784dd4a9e90",
  measurementId: "G-LVQJBSF4MZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
