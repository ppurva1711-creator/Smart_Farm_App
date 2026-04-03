// app/api/sensor-data/route.ts
// Updated to work with ESP32 + SIM7000E hardware
// The ESP32 doesn't have real epoch time so we use server timestamp
// Secret is a simple shared string (not HMAC with timestamp)

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";

export async function POST(req: NextRequest) {
  let body: {
    deviceId: string;
    temperature: number;
    humidity?: number;
    battery: number;
    batteryVoltage: number;
    valveStates: Record<string, boolean>;
    location?: string;
    secret: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId, temperature, humidity, battery,
          batteryVoltage, valveStates, location, secret } = body;

  // Simple secret check — no timestamp needed
  if (secret !== process.env.HARDWARE_SHARED_SECRET) {
    // In dev mode, allow if secret is missing
    if (process.env.NODE_ENV === "production" && !secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db  = getAdminDb();
  const now = Date.now();

  // Write sensor data
  await db.ref(`devices/${deviceId}/sensors`).set({
    temperature:    temperature  ?? null,
    humidity:       humidity     ?? null,
    battery:        battery      ?? null,
    batteryVoltage: batteryVoltage ?? null,
    timestamp:      now,
  });

  // Write valve states (hardware confirmed)
  if (valveStates && typeof valveStates === "object") {
    const updates: Record<string, unknown> = {};
    for (const [valveId, isOpen] of Object.entries(valveStates)) {
      updates[`devices/${deviceId}/valves/${valveId}/hardwareState`] = isOpen;
      updates[`devices/${deviceId}/valves/${valveId}/lastConfirmed`] = now;
    }
    await db.ref().update(updates);
  }

  // Write location if provided
  if (location && typeof location === "string") {
    const [lat, lng] = location.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      await db.ref(`devices/${deviceId}/location`).set({
        lat, lng, source: "gps-neo6m",
        timestamp: now, accuracy: 5, pending: false,
      });
    }
  }

  // Battery cycle tracking
  await trackBattery(deviceId, battery);

  // History (every 30s)
  const key = new Date(now).toISOString().slice(0, 16).replace(":", "-");
  await db.ref(`devices/${deviceId}/history/sensors/${key}`).set({
    temperature, battery, batteryVoltage, timestamp: now,
  });

  return NextResponse.json({ ok: true, receivedAt: now });
}

async function trackBattery(deviceId: string, current: number) {
  const db  = getAdminDb();
  const ref = db.ref(`devices/${deviceId}/battery/cycleTracking`);
  const snap = await ref.once("value");
  const tracking = snap.val() ?? { lastPercent: current };

  const prev = tracking.lastPercent ?? current;
  const updates: Record<string, unknown> = { lastPercent: current };

  if (prev <= 20 && current > 20 && !tracking.cycleStartTime) {
    updates.cycleStartPercent = prev;
    updates.cycleStartTime    = Date.now();
  }

  if (tracking.cycleStartTime && current >= 80) {
    const cycleId = `cycle_${Date.now()}`;
    await db.ref(`devices/${deviceId}/battery/cycles/${cycleId}`).set({
      id: cycleId,
      startPercent: tracking.cycleStartPercent ?? prev,
      endPercent: current,
      startTime:  tracking.cycleStartTime,
      endTime:    Date.now(),
    });
    updates.cycleStartPercent = null;
    updates.cycleStartTime    = null;
  }

  await ref.update(updates);
}