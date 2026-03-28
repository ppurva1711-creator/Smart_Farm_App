// hooks/useRealtimeDevice.ts
// ─────────────────────────────────────────────────────────────────────────────
// Custom React hook that opens Firebase Realtime Database listeners.
// Use this in any component that needs live updates without polling.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { ref, onValue, off, DatabaseReference } from "firebase/database";
import { getClientDb } from "@/lib/firebase";
import { SensorData, ValveState, DailyWaterSummary, BatteryHealth, LocationData } from "@/types";

interface RealtimeDeviceData {
  sensors:    SensorData | null;
  valves:     Record<string, ValveState> | null;
  water:      DailyWaterSummary | null;
  battery:    BatteryHealth | null;
  location:   LocationData | null;
  isLoading:  boolean;
  lastError:  string | null;
}

export function useRealtimeDevice(deviceId: string | null): RealtimeDeviceData {
  const [sensors,   setSensors]   = useState<SensorData | null>(null);
  const [valves,    setValves]    = useState<Record<string, ValveState> | null>(null);
  const [water,     setWater]     = useState<DailyWaterSummary | null>(null);
  const [battery,   setBattery]   = useState<BatteryHealth | null>(null);
  const [location,  setLocation]  = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) { setIsLoading(false); return; }

    const db   = getClientDb();
    const refs: DatabaseReference[] = [];

    const listen = <T>(path: string, setter: (v: T | null) => void) => {
      const r = ref(db, path);
      refs.push(r);
      onValue(
        r,
        (snap) => { setter(snap.val()); setIsLoading(false); },
        (err)  => { setLastError(err.message); setIsLoading(false); }
      );
    };

    const todayKey = new Date().toISOString().slice(0, 10);

    listen<SensorData>(`devices/${deviceId}/sensors`,                    setSensors);
    listen<Record<string, ValveState>>(`devices/${deviceId}/valves`,     setValves);
    listen<DailyWaterSummary>(`devices/${deviceId}/waterUsage/daily/${todayKey}`, setWater);
    listen<LocationData>(`devices/${deviceId}/location`,                 setLocation);

    // Battery health needs to be computed client-side too (from cycle count)
    const batteryRef = ref(db, `devices/${deviceId}/battery`);
    refs.push(batteryRef);
    onValue(batteryRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const cycleCount = Object.keys(data.cycles ?? {}).length;
      const currentPercent = data.cycleTracking?.lastPercent ?? 0;
      setBattery({
        currentPercent,
        currentVoltage:         data.cycleTracking?.lastVoltage ?? 0,
        cycleCount,
        estimatedHealthPercent: Math.max(0, 100 - cycleCount * 0.5),
        isCharging:             data.cycleTracking?.cycleStartTime != null,
        lastUpdated:            Date.now(),
      });
    });

    return () => refs.forEach((r) => off(r));
  }, [deviceId]);

  return { sensors, valves, water, battery, location, isLoading, lastError };
}

// ── Simpler hook: just temperature ────────────────────────────────────────────
export function useLiveTemperature(deviceId: string | null) {
  const [temp, setTemp] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const db = getClientDb();
    const r  = ref(db, `devices/${deviceId}/sensors`);

    onValue(r, (snap) => {
      const data = snap.val();
      if (data?.temperature !== undefined) {
        setTemp(data.temperature);
        setStale(Date.now() - (data.timestamp ?? 0) > 120_000);
      }
    });

    return () => off(r);
  }, [deviceId]);

  return { temp, stale };
}

// ── Valve toggle helper ────────────────────────────────────────────────────────
export function useValveToggle(deviceId: string) {
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const toggleValve = useCallback(
    async (valveId: string, desiredState: boolean, idToken: string) => {
      setPending((p) => ({ ...p, [valveId]: true }));
      try {
        const res = await fetch("/api/valves", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({ deviceId, valveId, desiredState }),
        });
        if (!res.ok) throw new Error("Toggle failed");
      } finally {
        setPending((p) => ({ ...p, [valveId]: false }));
      }
    },
    [deviceId]
  );

  return { toggleValve, pending };
}
