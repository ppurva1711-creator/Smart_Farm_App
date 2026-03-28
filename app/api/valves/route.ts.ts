// app/api/valves/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET   /api/valves?deviceId=xxx          ← polled by SIM800L every 5 seconds
// POST  /api/valves                       ← user toggles a valve from the app
// PUT   /api/valves  (valve confirm)      ← hardware confirms it acted
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase";
import { validateHardwareSecret, verifyUserToken, unauthorizedResponse }
  from "../../../middleware/hardware-auth";
import type { HardwareValveConfirmPayload } from "../../../types";

// ── GET: Hardware polls for desired valve states every 5 seconds ─────────────
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const secret   = req.nextUrl.searchParams.get("secret") ?? "";
  const tsParam  = req.nextUrl.searchParams.get("ts");

  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  // Light auth: validate HMAC
  const ts = parseInt(tsParam ?? "0", 10);
  if (!validateHardwareSecret(deviceId, ts, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snapshot = await db.ref(`devices/${deviceId}/valves`).once("value");
  const valves = snapshot.val() ?? {};

  // Return only the desired (app-commanded) state for each valve
  const response: Record<string, boolean> = {};
  for (const [id, data] of Object.entries(valves as Record<string, Record<string, unknown>>)) {
    response[id] = !!(data as { desiredState?: boolean }).desiredState;
  }

  return NextResponse.json(response);
}

// ── POST: User toggles a valve from the app ───────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  let body: { deviceId: string; valveId: string; desiredState: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, valveId, desiredState } = body;
  if (!deviceId || !valveId || typeof desiredState !== "boolean") {
    return NextResponse.json({ error: "deviceId, valveId, desiredState required" }, { status: 400 });
  }

  const db   = getAdminDb();
  const now  = Date.now();
  const ref  = db.ref(`devices/${deviceId}/valves/${valveId}`);
  const snap = await ref.once("value");
  const current = snap.val() ?? {};

  // ── Write desired state (hardware will pick this up within 5 seconds) ────
  await ref.update({
    desiredState,
    desiredAt: now,
    desiredBy: uid,
  });

  // ── Start/stop water usage tracking ──────────────────────────────────────
  if (desiredState && !current.openedAt) {
    // Valve opening: record start time
    await ref.update({ openedAt: now, closedAt: null });
  } else if (!desiredState && current.openedAt) {
    // Valve closing: calculate water used
    const openedAt: number = current.openedAt;
    const durationMinutes  = (now - openedAt) / 60_000;
    const flowRateLPM: number = current.flowRateLPM ?? 10; // default 10 L/min
    const litresUsed = durationMinutes * flowRateLPM;
    const dateKey    = new Date(now).toISOString().slice(0, 10); // "YYYY-MM-DD"

    const usageEntry = {
      valveId,
      openedAt,
      closedAt: now,
      durationMinutes: Math.round(durationMinutes * 100) / 100,
      litresUsed: Math.round(litresUsed),
      date: dateKey,
    };

    // Save individual usage entry
    await db.ref(`devices/${deviceId}/waterUsage/entries`).push(usageEntry);

    // Update daily summary
    const summaryRef = db.ref(`devices/${deviceId}/waterUsage/daily/${dateKey}`);
    const summarySnap = await summaryRef.once("value");
    const summary = summarySnap.val() ?? { totalLitres: 0, byValve: {} };

    const tankCapacity = await getTankCapacity(deviceId);
    const newTotal = (summary.totalLitres ?? 0) + Math.round(litresUsed);
    const byValve  = summary.byValve ?? {};
    byValve[valveId] = (byValve[valveId] ?? 0) + Math.round(litresUsed);

    await summaryRef.set({
      date: dateKey,
      totalLitres: newTotal,
      tankCapacityLitres: tankCapacity,
      ratioPercent: Math.min(100, Math.round((newTotal / tankCapacity) * 100)),
      byValve,
    });

    await ref.update({ closedAt: now, openedAt: null });
  }

  return NextResponse.json({ ok: true, valveId, desiredState, queuedAt: now });
}

// ── PUT: Hardware confirms it physically opened/closed a valve ────────────────
export async function PUT(req: NextRequest) {
  let body: HardwareValveConfirmPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, valveId, actualState, timestamp, secret } = body;

  if (!validateHardwareSecret(deviceId, timestamp, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  await db.ref(`devices/${deviceId}/valves/${valveId}`).update({
    hardwareState: actualState,
    lastConfirmed: Date.now(),
  });

  return NextResponse.json({ ok: true });
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function getTankCapacity(deviceId: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db.ref(`devices/${deviceId}/config/tankCapacityLitres`).once("value");
  return snap.val() ?? 2000; // default 2000 L
}
