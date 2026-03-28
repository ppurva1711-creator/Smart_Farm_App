// app/api/dashboard/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/dashboard?deviceId=xxx
// Returns a single aggregated payload for the main dashboard:
//   - Live sensor readings
//   - All valve states (desired + hardware confirmed)
//   - Today's water usage with ratio
//   - Battery health (cycle count, estimated health %)
//   - Last known location
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase";
import { verifyUserToken, unauthorizedResponse } from "../../../middleware/hardware-auth";
import type { BatteryHealth } from "../../../types";

export async function GET(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  // Verify ownership
  const db         = getAdminDb();
  const ownerSnap  = await db.ref(`devices/${deviceId}/config/ownerId`).once("value");
  if (ownerSnap.val() !== uid) {
    return NextResponse.json({ error: "Device not found or access denied" }, { status: 403 });
  }

  // Fetch all data in parallel
  const [sensSnap, valveSnap, waterSnap, batterySnap, locationSnap, cyclesSnap] =
    await Promise.all([
      db.ref(`devices/${deviceId}/sensors`).once("value"),
      db.ref(`devices/${deviceId}/valves`).once("value"),
      db.ref(`devices/${deviceId}/waterUsage/daily/${todayKey()}`).once("value"),
      db.ref(`devices/${deviceId}/battery/cycleTracking`).once("value"),
      db.ref(`devices/${deviceId}/location`).once("value"),
      db.ref(`devices/${deviceId}/battery/cycles`).once("value"),
    ]);

  const sensors  = sensSnap.val()   ?? {};
  const valves   = valveSnap.val()  ?? {};
  const water    = waterSnap.val()  ?? { totalLitres: 0, ratioPercent: 0, byValve: {} };
  const tracking = batterySnap.val() ?? {};
  const location = locationSnap.val() ?? null;
  const cycles   = cyclesSnap.val()  ?? {};

  // ── Battery health calculation ─────────────────────────────────────────────
  const cycleCount       = Object.keys(cycles).length;
  const healthPercent    = Math.max(0, Math.round(100 - cycleCount * 0.5));
  const isCharging       = (tracking.lastPercent ?? 0) < (sensors.battery ?? 0);

  const batteryHealth: BatteryHealth = {
    currentPercent:          sensors.battery ?? 0,
    currentVoltage:          sensors.batteryVoltage ?? 0,
    cycleCount,
    estimatedHealthPercent:  healthPercent,
    isCharging,
    lastUpdated:             sensors.timestamp ?? 0,
  };

  // ── Valve summary (desired vs hardware-confirmed) ─────────────────────────
  const valveSummary = Object.entries(
    valves as Record<string, Record<string, unknown>>
  ).map(([id, v]) => ({
    id,
    desiredState:   !!(v.desiredState),
    hardwareState:  !!(v.hardwareState),
    isSynced:       v.desiredState === v.hardwareState,
    openedAt:       v.openedAt ?? null,
    flowRateLPM:    v.flowRateLPM ?? 10,
    label:          v.label ?? id,
  }));

  return NextResponse.json({
    sensors: {
      temperature:    sensors.temperature ?? null,
      humidity:       sensors.humidity ?? null,
      lastUpdated:    sensors.timestamp ?? null,
      isStale:        Date.now() - (sensors.timestamp ?? 0) > 2 * 60 * 1000, // > 2 min = stale
    },
    valves:      valveSummary,
    waterUsage:  water,
    battery:     batteryHealth,
    location,
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
