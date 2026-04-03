// app/api/valves/route.ts
// Works with ESP32 — no timestamp HMAC, simple secret

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";

const SECRET = process.env.HARDWARE_SHARED_SECRET ?? "";

// ── GET: ESP32 polls every 5 seconds ────────────────────────
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const secret   = req.nextUrl.searchParams.get("secret") ?? "";

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  // Simple secret check
  if (SECRET && secret !== SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db   = getAdminDb();
  const snap = await db.ref(`devices/${deviceId}/valves`).once("value");
  const valves = snap.val() ?? {};

  // Return desired state for each valve
  const response: Record<string, boolean> = {};
  for (const [id, data] of Object.entries(valves as Record<string, Record<string, unknown>>)) {
    response[id] = !!(data as { desiredState?: boolean }).desiredState;
  }

  return NextResponse.json(response);
}

// ── POST: User toggles valve from app ───────────────────────
export async function POST(req: NextRequest) {
  // Try to verify Firebase token — optional for now
  const authHeader = req.headers.get("Authorization");
  if (!authHeader && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { deviceId: string; valveId: string; desiredState: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, valveId, desiredState } = body;
  if (!deviceId || !valveId || typeof desiredState !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db  = getAdminDb();
  const now = Date.now();
  const ref = db.ref(`devices/${deviceId}/valves/${valveId}`);
  const snap = await ref.once("value");
  const current = snap.val() ?? {};

  await ref.update({ desiredState, desiredAt: now });

  // Water usage tracking
  if (desiredState && !current.openedAt) {
    await ref.update({ openedAt: now, closedAt: null });
  } else if (!desiredState && current.openedAt) {
    const openedAt = current.openedAt as number;
    const durationMin = (now - openedAt) / 60000;
    const flowRate    = (current.flowRateLPM as number) ?? 10;
    const litres      = Math.round(durationMin * flowRate);
    const dateKey     = new Date(now).toISOString().slice(0, 10);

    await ref.update({ closedAt: now, openedAt: null });

    const summaryRef  = db.ref(`devices/${deviceId}/waterUsage/daily/${dateKey}`);
    const summarySnap = await summaryRef.once("value");
    const summary     = summarySnap.val() ?? { totalLitres: 0, byValve: {} };
    const newTotal    = (summary.totalLitres ?? 0) + litres;

    const tankSnap = await db.ref(`devices/${deviceId}/config/tankCapacityLitres`).once("value");
    const tank     = tankSnap.val() ?? 2000;

    await summaryRef.set({
      date: dateKey,
      totalLitres: newTotal,
      tankCapacityLitres: tank,
      ratioPercent: Math.min(100, Math.round((newTotal / tank) * 100)),
      byValve: { ...summary.byValve, [valveId]: (summary.byValve?.[valveId] ?? 0) + litres },
    });
  }

  return NextResponse.json({ ok: true, valveId, desiredState, queuedAt: now });
}

// ── PUT: ESP32 confirms valve action ────────────────────────
export async function PUT(req: NextRequest) {
  let body: {
    deviceId: string;
    valveId: string;
    actualState: boolean;
    timestamp: number;
    secret: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { deviceId, valveId, actualState, secret } = body;

  if (SECRET && secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  await db.ref(`devices/${deviceId}/valves/${valveId}`).update({
    hardwareState: actualState,
    lastConfirmed: Date.now(),
  });

  return NextResponse.json({ ok: true });
}