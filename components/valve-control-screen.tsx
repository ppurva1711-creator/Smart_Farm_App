"use client";

import { useState, useEffect } from "react";
import { getClientDb } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { Switch } from "./ui/switch";
import { Droplets, Activity } from "lucide-react";

interface ValveData {
  desiredState:  boolean;
  hardwareState?: boolean;
  lastCommand?:  string;
  flowRateLPM?:  number;
  totalLitres?:  number;
  openedAt?:     number;
  closedAt?:     number;
  lastFlowAt?:   number;
}

export function ValveControlScreen() {
  const deviceId =
    typeof window !== "undefined"
      ? localStorage.getItem("sf_device_id")
      : null;

  const [valves, setValves]         = useState<Record<string, ValveData>>({});
  const [toggling, setToggling]     = useState<Record<string, boolean>>({});
  const [todayLitres, setTodayLitres] = useState<number>(0);

  useEffect(() => {
    if (!deviceId) return;
    const db = getClientDb();

    // Listen to valves
    const valvesRef = ref(db, `devices/${deviceId}/valves`);
    onValue(valvesRef, (snap) => setValves(snap.val() || {}));

    // Listen to today's water usage total
    const today    = new Date().toISOString().slice(0, 10);
    const usageRef = ref(db, `devices/${deviceId}/waterUsage/daily/${today}/totalLitres`);
    onValue(usageRef, (snap) => setTodayLitres(snap.val() ?? 0));

    return () => { off(valvesRef); off(usageRef); };
  }, [deviceId]);

  const toggleValve = async (valveId: string, newState: boolean) => {
    if (!deviceId) return;
    setToggling(p => ({ ...p, [valveId]: true }));
    try {
      await fetch("/api/valves", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ deviceId, valveId, desiredState: newState }),
      });
    } finally {
      setToggling(p => ({ ...p, [valveId]: false }));
    }
  };

  if (!deviceId) return <div className="p-6">📡 No device connected</div>;

  return (
    <div className="p-6 space-y-4">

      {/* Today's total water usage */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Droplets className="text-blue-500" size={28} />
        <div>
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">
            Water Used Today
          </p>
          <p className="text-2xl font-bold text-blue-700">
            {todayLitres.toFixed(1)} L
          </p>
        </div>
      </div>

      {/* Per-valve cards */}
      {Object.entries(valves).map(([id, valve]) => {
        const isOn       = !!valve.desiredState;
        const confirmed  = valve.hardwareState === valve.desiredState;
        const flowActive = valve.flowRateLPM != null && valve.flowRateLPM > 0;

        return (
          <div
            key={id}
            className={`rounded-xl shadow p-4 border transition-all ${
              isOn ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
            }`}
          >
            {/* Top row: name + switch */}
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-semibold text-gray-800 capitalize">
                  {id.replace("valve", "Valve ")}
                </p>
                <p className={`text-xs mt-0.5 ${confirmed ? "text-green-500" : "text-amber-500"}`}>
                  {confirmed
                    ? (isOn ? "✓ Running" : "✓ Closed")
                    : "⏳ Updating..."}
                </p>
              </div>

              <Switch
                checked={isOn}
                disabled={!!toggling[id]}
                onCheckedChange={(v) => toggleValve(id, v)}
              />
            </div>

            {/* Flow stats — shown when valve is on and sensor is reporting */}
            {isOn && (
              <div className="flex gap-4 mt-2 pt-2 border-t border-green-100">
                <div className="flex items-center gap-1.5">
                  <Activity
                    size={14}
                    className={flowActive ? "text-green-500 animate-pulse" : "text-gray-300"}
                  />
                  <span className="text-sm text-gray-600">
                    {flowActive
                      ? `${valve.flowRateLPM!.toFixed(1)} L/min`
                      : "No flow detected"}
                  </span>
                </div>

                {valve.totalLitres != null && (
                  <div className="flex items-center gap-1.5">
                    <Droplets size={14} className="text-blue-400" />
                    <span className="text-sm text-gray-600">
                      {valve.totalLitres.toFixed(1)} L today
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}