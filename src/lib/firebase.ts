import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const app =
  getApps()[0] ??
  initializeApp({
    // Placeholder prevents the static build from crashing when variables are missing.
    // Sign-in will simply fail until the real NEXT_PUBLIC_FIREBASE_* values are set.
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

export const auth = getAuth(app);
export const db = getFirestore(app);
