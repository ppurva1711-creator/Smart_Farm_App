// app/api/sensor-data/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/sensor-data
// Called by the SIM800L hardware every ~30 seconds.
// Writes sensor readings and valve states to Firebase Realtime DB.
// Also calculates battery charge cycles on the fly.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase";
import { validateHardwareSecret } from "../../../middleware/hardware-auth";
import type { HardwareSensorPayload, BatteryChargeCycle } from "../../../types";

export async function POST(req: NextRequest) {
  let body: HardwareSensorPayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, temperature, humidity, battery, batteryVoltage,
          valveStates, location, secret } = body;

  // ── 1. Authenticate hardware ─────────────────────────────────────────────
  const timestamp = Date.now();
  if (!validateHardwareSecret(deviceId, timestamp, secret)) {
    return NextResponse.json({ error: "Unauthorized device" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Date.now();

  // ── 2. Write live sensor snapshot ────────────────────────────────────────
  await db.ref(`devices/${deviceId}/sensors`).set({
    temperature: temperature ?? null,
    humidity: humidity ?? null,
    battery,
    batteryVoltage,
    timestamp: now,
  });

  // ── 3. Write valve states (hardware confirmed actuals) ───────────────────
  if (valveStates && typeof valveStates === "object") {
    const updates: Record<string, unknown> = {};
    for (const [valveId, isOpen] of Object.entries(valveStates)) {
      updates[`devices/${deviceId}/valves/${valveId}/hardwareState`] = isOpen;
      updates[`devices/${deviceId}/valves/${valveId}/lastConfirmed`] = now;
    }
    await db.ref().update(updates);
  }

  // ── 4. Write location if provided ────────────────────────────────────────
  if (location && typeof location === "string") {
    const [lat, lng] = location.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      await db.ref(`devices/${deviceId}/location`).set({
        lat,
        lng,
        source: "gsm-cell",
        timestamp: now,
        accuracy: 150,          // GSM cell accuracy estimate in metres
      });
    }
  }

  // ── 5. Battery charge-cycle tracking ─────────────────────────────────────
  await trackBatteryCycle(deviceId, battery);

  // ── 6. Persist to sensor history (1-minute resolution) ──────────────────
  const minuteKey = new Date(now).toISOString().slice(0, 16).replace(":", "-");
  await db.ref(`devices/${deviceId}/history/sensors/${minuteKey}`).set({
    temperature: temperature ?? null,
    battery,
    batteryVoltage,
    timestamp: now,
  });

  return NextResponse.json({ ok: true, receivedAt: now });
}

// ── Helper: detect and record battery charge cycles ─────────────────────────
async function trackBatteryCycle(deviceId: string, currentPercent: number) {
  const db = getAdminDb();
  const cycleRef = db.ref(`devices/${deviceId}/battery/cycleTracking`);
  const snapshot = await cycleRef.once("value");
  const tracking = snapshot.val() ?? { lastPercent: currentPercent, cycleStartPercent: null, cycleStartTime: null };

  const LOW_THRESHOLD = 20;
  const HIGH_THRESHOLD = 80;
  const prev = tracking.lastPercent ?? currentPercent;

  let updates: Record<string, unknown> = { lastPercent: currentPercent };

  // Detect start of charge (battery was low, now rising)
  if (prev <= LOW_THRESHOLD && currentPercent > LOW_THRESHOLD && !tracking.cycleStartTime) {
    updates.cycleStartPercent = prev;
    updates.cycleStartTime = Date.now();
  }

  // Detect end of charge cycle (reached high threshold)
  if (tracking.cycleStartTime && currentPercent >= HIGH_THRESHOLD) {
    const cycleId = `cycle_${Date.now()}`;
    const cycle: BatteryChargeCycle = {
      id: cycleId,
      startPercent: tracking.cycleStartPercent ?? prev,
      endPercent: currentPercent,
      startTime: tracking.cycleStartTime,
      endTime: Date.now(),
    };

    await db.ref(`devices/${deviceId}/battery/cycles/${cycleId}`).set(cycle);
    updates.cycleStartPercent = null;
    updates.cycleStartTime = null;
  }

  await cycleRef.update(updates);
}
