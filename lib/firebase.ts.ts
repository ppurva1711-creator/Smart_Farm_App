// lib/firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firebase initialization – imported by every API route and client component
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import { getDatabase as getClientDatabase } from "firebase/database";
import { getAuth as getClientAuth } from "firebase/auth";

// ── Admin SDK (server-side, for API routes) ──────────────────────────────────
export function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export function getAdminDb() {
  return getDatabase(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

// ── Client SDK (browser/React components) ────────────────────────────────────
const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export function getClientApp() {
  if (getClientApps().length > 0) return getClientApps()[0];
  return initClientApp(clientConfig);
}

export function getClientDb() {
  return getClientDatabase(getClientApp());
}

export function getClientAuthInstance() {
  return getClientAuth(getClientApp());
}
