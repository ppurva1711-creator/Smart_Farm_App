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

  if (schedule.enabled && schedule.start && schedule.end) {
    finalState = isWithinTimeRange(schedule.start, schedule.end, now);
  }

  if (isBlockedByLoadShedding(load.ranges || [], now)) {
    finalState = false;
  }

  console.log("GET → Device:", deviceId, "Final State:", finalState);

  return NextResponse.json({
    desiredState: finalState,
    hardwareState: motor.hardwareState ?? null,
    lastConfirmed: motor.lastConfirmed ?? null,
  });
}

// =====================================================
// POST → App sets desired state (TEST + REAL)
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let deviceId = body.deviceId || "farm_001";
    let desiredState: boolean;

    // 🔥 SUPPORT BOTH FORMATS
    if (typeof body.desiredState === "boolean") {
      desiredState = body.desiredState;
    } else if (body.state) {
      desiredState = body.state === "ON";
    } else {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    console.log("🔥 MOTOR REQUEST RECEIVED:", desiredState ? "ON" : "OFF");

    const db = getAdminDb();

    await db.ref(`devices/${deviceId}/motor`).update({
      desiredState,
      desiredAt: Date.now(),
    });

    console.log("✅ DATABASE UPDATED");

    return NextResponse.json({
      ok: true,
      desiredState,
      message: desiredState ? "Motor ON requested" : "Motor OFF requested",
    });

  } catch (err) {
    console.error("❌ POST ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// =====================================================
// PUT → Hardware confirms actual state
// =====================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

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

    console.log("🔁 HARDWARE CONFIRMED:", actualState ? "ON" : "OFF");

    return NextResponse.json({
      ok: true,
      confirmed: actualState,
    });

  } catch (err) {
    console.error("❌ PUT ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}