// app/api/auth/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/auth/setup-profile   ← after OTP verified, save user profile
// GET   /api/auth/profile         ← fetch user profile
//
// NOTE: OTP send/verify is handled 100% client-side via Firebase Phone Auth SDK.
//       These routes handle post-auth profile storage only.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase";
import { verifyUserToken, unauthorizedResponse } from "../../../middleware/hardware-auth";
import type { UserProfile } from "../../../types";

// ── POST /api/auth/setup-profile ─────────────────────────────────────────────
// Called once after OTP login completes (first time or profile update)
export async function POST(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const {
    phone,
    hardwareSimNumber,
    tankCapacityLitres,
    language,
    deviceId,
  }: {
    phone: string;
    hardwareSimNumber: string;   // SIM800L SIM in E.164 e.g. "+919876543210"
    tankCapacityLitres: number;
    language: UserProfile["language"];
    deviceId: string;
  } = await req.json();

  // Validate E.164 format for both numbers
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(phone) || !e164Regex.test(hardwareSimNumber)) {
    return NextResponse.json(
      { error: "Phone numbers must be in E.164 format (e.g. +919876543210)" },
      { status: 400 }
    );
  }

  const db  = getAdminDb();
  const now = Date.now();

  // Check if user exists already
  const existingSnap = await db.ref(`users/${uid}`).once("value");
  const createdAt = existingSnap.val()?.createdAt ?? now;

  const profile: UserProfile = {
    uid,
    phone,
    hardwareSimNumber,
    tankCapacityLitres: tankCapacityLitres ?? 2000,
    language: language ?? "en",
    createdAt,
  };

  // Save user profile
  await db.ref(`users/${uid}`).update(profile);

  // Link device to user & write hardware config
  await db.ref(`devices/${deviceId}/config`).update({
    hardwareSimNumber,
    tankCapacityLitres: tankCapacityLitres ?? 2000,
    ownerId: uid,
  });

  // Link deviceId to user
  await db.ref(`users/${uid}/devices/${deviceId}`).set(true);

  return NextResponse.json({ ok: true, profile });
}

// ── GET /api/auth/profile ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const db   = getAdminDb();
  const snap = await db.ref(`users/${uid}`).once("value");

  if (!snap.exists()) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(snap.val());
}
