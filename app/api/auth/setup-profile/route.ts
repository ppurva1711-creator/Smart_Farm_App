import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { verifyUserToken, unauthorizedResponse } from "../../../../middleware/hardware-auth";

export async function POST(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const {
    phone,
    hardwareSimNumber,
    tankCapacityLitres,
    language,
    deviceId,
  } = await req.json();

  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(phone)) {
    return NextResponse.json(
      { error: "Phone must be in E.164 format e.g. +919876543210" },
      { status: 400 }
    );
  }

  const db  = getAdminDb();
  const now = Date.now();

  const existingSnap = await db.ref(`users/${uid}`).once("value");
  const createdAt = existingSnap.val()?.createdAt ?? now;

  const profile = {
    uid,
    phone,
    hardwareSimNumber: hardwareSimNumber ?? "",
    tankCapacityLitres: tankCapacityLitres ?? 2000,
    language: language ?? "en",
    createdAt,
    updatedAt: now,
  };

  await db.ref(`users/${uid}`).update(profile);

  if (deviceId) {
    await db.ref(`devices/${deviceId}/config`).update({
      hardwareSimNumber: hardwareSimNumber ?? "",
      tankCapacityLitres: tankCapacityLitres ?? 2000,
      ownerId: uid,
    });
    await db.ref(`users/${uid}/devices/${deviceId}`).set(true);
  }

  return NextResponse.json({ ok: true, profile });
}
