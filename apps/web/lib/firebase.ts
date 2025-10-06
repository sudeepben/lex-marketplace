import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};
export const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);
export const storage = getStorage(app);