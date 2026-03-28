// lib/firebase.ts
// Client-side Firebase ONLY — safe to import in browser/React components
// Admin SDK has been moved to lib/firebase-admin.ts (server only)

import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const clientConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function getClientApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(clientConfig);
}

export function getClientDb() {
  return getDatabase(getClientApp());
}

export function getClientAuthInstance() {
  return getAuth(getClientApp());
}
