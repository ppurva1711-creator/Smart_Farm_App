// app/api/sensor-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";

export async function POST(req: NextRequest) {
  let body: {
    deviceId: string;
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    battery?: number;
    batteryVoltage?: number;
    valveStates?: Record<string, boolean>;
    motorState?: boolean;
    location?: string;
    secret: string;
  };

  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { deviceId, temperature, humidity, soilMoisture,
          battery, batteryVoltage, valveStates, motorState, location, secret } = body;

  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  // Simple secret check
  const expectedSecret = process.env.HARDWARE_SHARED_SECRET;
  if (expectedSecret && secret !== expectedSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db  = getAdminDb();
  const now = Date.now();

  // Write sensor snapshot
  await db.ref(`devices/${deviceId}/sensors`).set({
    temperature:    temperature    ?? null,
    humidity:       humidity       ?? null,
    soilMoisture:   soilMoisture   ?? null,
    battery:        battery        ?? null,
    batteryVoltage: batteryVoltage ?? null,
    timestamp:      now,
  });

  // Write valve hardware states (confirmed by hardware)
  if (valveStates && typeof valveStates === "object") {
    const updates: Record<string, unknown> = {};
    for (const [valveId, isOpen] of Object.entries(valveStates)) {
      updates[`devices/${deviceId}/valves/${valveId}/hardwareState`] = isOpen;
      updates[`devices/${deviceId}/valves/${valveId}/lastConfirmed`] = now;
    }
    await db.ref().update(updates);
  }

  if (typeof motorState === "boolean") {
    await db.ref(`devices/${deviceId}/motor`).update({
      hardwareState: motorState,
      lastConfirmed: now,
    });
  }
  
  // Write GPS location
  if (location && typeof location === "string" && location.includes(",")) {
    const [lat, lng] = location.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      await db.ref(`devices/${deviceId}/location`).set({
        lat, lng, source: "gps-hardware",
        timestamp: now, accuracy: 10, pending: false,
      });
    }
  }

  // Battery cycle tracking
  try {
    const cycleRef  = db.ref(`devices/${deviceId}/battery/cycleTracking`);
    const cycleSnap = await cycleRef.once("value");
    const tracking  = cycleSnap.val() ?? { lastPercent: battery ?? 100 };
    const prev      = tracking.lastPercent ?? 100;
    const curr      = battery ?? 100;
    const updates: Record<string, unknown> = { lastPercent: curr };

    if (prev <= 20 && curr > 20 && !tracking.cycleStartTime) {
      updates.cycleStartPercent = prev;
      updates.cycleStartTime    = now;
    }
    if (tracking.cycleStartTime && curr >= 80) {
      const cycleId = `cycle_${now}`;
      await db.ref(`devices/${deviceId}/battery/cycles/${cycleId}`).set({
        id: cycleId, startPercent: tracking.cycleStartPercent ?? prev,
        endPercent: curr, startTime: tracking.cycleStartTime, endTime: now,
      });
      updates.cycleStartPercent = null;
      updates.cycleStartTime    = null;
    }
    await cycleRef.update(updates);
  } catch { /* non-critical */ }

  // Save to history (1-minute resolution)
  const key = new Date(now).toISOString().slice(0, 16).replace(":", "-");
  await db.ref(`devices/${deviceId}/history/sensors/${key}`).set({
    temperature, battery, batteryVoltage, timestamp: now,
  });

  return NextResponse.json({ ok: true, receivedAt: now });
}