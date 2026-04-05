// app/api/valves/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";

const SECRET = process.env.HARDWARE_SHARED_SECRET ?? "";

// Hardware polls this every 5 seconds
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const secret   = req.nextUrl.searchParams.get("secret") ?? "";

  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  if (SECRET && secret !== SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db   = getAdminDb();
  const snap = await db.ref(`devices/${deviceId}/valves`).once("value");
  const valves = snap.val() ?? {};

  const response: Record<string, boolean> = {};
  for (const [id, data] of Object.entries(valves as Record<string, Record<string, unknown>>)) {
    response[id] = !!(data.desiredState);
  }

  return NextResponse.json(response);
}

// App writes desired valve state
export async function POST(req: NextRequest) {
  let body: { deviceId: string; valveId: string; desiredState: boolean; secret?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { deviceId, valveId, desiredState } = body;
  if (!deviceId || !valveId || typeof desiredState !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db   = getAdminDb();
  const now  = Date.now();
  const r    = db.ref(`devices/${deviceId}/valves/${valveId}`);
  const snap = await r.once("value");
  const curr = snap.val() ?? {};

  await r.update({ desiredState, desiredAt: now });

  // Water usage tracking
  if (desiredState && !curr.openedAt) {
    await r.update({ openedAt: now, closedAt: null });
  } else if (!desiredState && curr.openedAt) {
    const openedAt    = curr.openedAt as number;
    const durationMin = (now - openedAt) / 60000;
    const flowRate    = (curr.flowRateLPM as number) ?? 10;
    const litres      = Math.round(durationMin * flowRate);
    const dateKey     = new Date(now).toISOString().slice(0, 10);
    await r.update({ closedAt: now, openedAt: null });

    const sumRef  = db.ref(`devices/${deviceId}/waterUsage/daily/${dateKey}`);
    const sumSnap = await sumRef.once("value");
    const sum     = sumSnap.val() ?? { totalLitres:0, byValve:{} };
    const tankSnap = await db.ref(`devices/${deviceId}/config/tankCapacityLitres`).once("value");
    const tank    = tankSnap.val() ?? 2000;
    const newTotal = (sum.totalLitres ?? 0) + litres;

    await sumRef.set({
      date: dateKey, totalLitres: newTotal, tankCapacityLitres: tank,
      ratioPercent: Math.min(100, Math.round((newTotal/tank)*100)),
      byValve: { ...sum.byValve, [valveId]: (sum.byValve?.[valveId] ?? 0) + litres },
    });
  }

  return NextResponse.json({ ok: true, valveId, desiredState, queuedAt: now });
}

// Hardware confirms action
export async function PUT(req: NextRequest) {
  let body: { deviceId: string; valveId: string; actualState: boolean; secret: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { deviceId, valveId, actualState, secret } = body;
  if (SECRET && secret !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  await db.ref(`devices/${deviceId}/valves/${valveId}`).update({
    hardwareState: actualState, lastConfirmed: Date.now(),
  });

  return NextResponse.json({ ok: true });
}