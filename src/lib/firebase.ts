import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

function getApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb(): Firestore {
  if (!firestoreDb) {
    firestoreDb = getFirestore(getApp());
  }
  return firestoreDb;
}

// Lazy-load analytics only when needed (it's heavy and not critical for page load)
export async function initAnalytics() {
  try {
    const { getAnalytics } = await import("firebase/analytics");
    return getAnalytics(getApp());
  } catch {
    // Analytics may fail in environments without consent or with ad blockers
    return null;
  }
}
