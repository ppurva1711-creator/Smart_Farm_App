import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";

const SECRET = process.env.HARDWARE_SHARED_SECRET ?? "";

// Hardware polls desired motor state
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const secret = req.nextUrl.searchParams.get("secret") ?? "";

  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  if (SECRET && secret !== SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.ref(`devices/${deviceId}/motor`).once("value");
  const motor = snap.val() ?? {};

  return NextResponse.json({
    motor: !!motor.desiredState,
    desiredState: !!motor.desiredState,
    hardwareState: typeof motor.hardwareState === "boolean" ? motor.hardwareState : null,
    lastConfirmed: motor.lastConfirmed ?? null,
    desiredAt: motor.desiredAt ?? null,
  });
}

// App writes desired motor state
export async function POST(req: NextRequest) {
  let body: { deviceId: string; desiredState: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, desiredState } = body;
  if (!deviceId || typeof desiredState !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getAdminDb();
  const now = Date.now();

  await db.ref(`devices/${deviceId}/motor`).update({
    desiredState,
    desiredAt: now,
  });

  return NextResponse.json({ ok: true, desiredState, queuedAt: now });
}

// Hardware confirms actual motor state
export async function PUT(req: NextRequest) {
  let body: { deviceId: string; actualState: boolean; secret: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, actualState, secret } = body;
  if (!deviceId || typeof actualState !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (SECRET && secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  await db.ref(`devices/${deviceId}/motor`).update({
    hardwareState: actualState,
    lastConfirmed: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
