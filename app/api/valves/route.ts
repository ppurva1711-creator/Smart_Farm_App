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
    response[id] = !!(data && (data as any).desiredState);
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

  const db  = getAdminDb();
  const now = Date.now();
  const r   = db.ref(`devices/${deviceId}/valves/${valveId}`);

  // Just write desired state + timestamps
  // Water usage is now handled ONLY by sensor-data/route.ts (real flow sensor)
  if (desiredState) {
    await r.update({
      desiredState,
      desiredAt:  now,
      openedAt:   now,
      closedAt:   null,
      lastCommand: "ON",
    });
  } else {
    await r.update({
      desiredState,
      desiredAt:  now,
      closedAt:   now,
      lastCommand: "OFF",
    });
  }

  return NextResponse.json({ ok: true, valveId, desiredState, queuedAt: now });
}

// Hardware confirms actual state
export async function PUT(req: NextRequest) {
  let body: { deviceId: string; valveId: string; actualState: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { deviceId, valveId, actualState } = body;
  if (!deviceId || !valveId || typeof actualState !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.ref(`devices/${deviceId}/valves/${valveId}`).update({
    hardwareState: actualState,
    lastConfirmed: Date.now(),
  });

  return NextResponse.json({ ok: true, confirmed: true });
}