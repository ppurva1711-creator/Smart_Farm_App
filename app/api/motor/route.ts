import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";

const SECRET = process.env.HARDWARE_SHARED_SECRET ?? "";

// =====================================================
// GET → Hardware polls desired state
// =====================================================
function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isWithinTimeRange(start: string, end: string, now: Date) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= toMin(start) && nowMin <= toMin(end);
}

function isBlockedByLoadShedding(ranges: string[], now: Date) {
  if (!ranges || ranges.length === 0) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (let r of ranges) {
    let [start, end] = r.split("-");
    if (nowMin >= toMin(start) && nowMin <= toMin(end)) {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const secret = req.nextUrl.searchParams.get("secret") ?? "";

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  if (SECRET && secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  const motorSnap = await db.ref(`devices/${deviceId}/motor`).once("value");
  const scheduleSnap = await db.ref(`devices/${deviceId}/schedule`).once("value");
  const loadSnap = await db.ref(`devices/${deviceId}/loadShedding`).once("value");

  const motor = motorSnap.val() || {};
  const schedule = scheduleSnap.val() || {};
  const load = loadSnap.val() || {};

  const now = new Date();

  let finalState = !!motor.desiredState;

  // ✅ APPLY SCHEDULING
  if (schedule.enabled && schedule.start && schedule.end) {
    finalState = isWithinTimeRange(schedule.start, schedule.end, now);
  }

  // ❌ BLOCK BY LOAD SHEDDING
  if (isBlockedByLoadShedding(load.ranges || [], now)) {
    finalState = false;
  }

  return NextResponse.json({
    desiredState: finalState,
    hardwareState: motor.hardwareState ?? null,
    lastConfirmed: motor.lastConfirmed ?? null,
  });
} 

// =====================================================
// POST → App sets desired state
// =====================================================
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

  return NextResponse.json({
    ok: true,
    desiredState,
    message: desiredState ? "Motor ON requested" : "Motor OFF requested",
  });
}

// =====================================================
// PUT → Hardware confirms actual state
// =====================================================
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
  const now = Date.now();

  await db.ref(`devices/${deviceId}/motor`).update({
    hardwareState: actualState,
    lastConfirmed: now,
  });

  return NextResponse.json({
    ok: true,
    confirmed: actualState,
    timestamp: now,
  });
}