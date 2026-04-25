"use client";

import { useState, useEffect, useCallback } from "react";
import { Power, Plus } from "lucide-react";
import { getClientDb } from "@/lib/firebase";
import { ref, onValue, off, update } from "firebase/database";
import { Switch } from "./ui/switch";

const MAX_VALVES = 16;

interface Valve {
  desiredState: boolean;
  hardwareState?: boolean | null;
  label?: string;
  location?: string;
}

export function ValveControlScreen() {
  const deviceId =
    typeof window !== "undefined"
      ? localStorage.getItem("sf_device_id")
      : null;

  const [valves, setValves] = useState<Record<string, Valve>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔁 REALTIME VALVES LISTENER
  useEffect(() => {
    if (!deviceId) return;

    const db = getClientDb();
    const valvesRef = ref(db, `devices/${deviceId}/valves`);

    onValue(valvesRef, (snap) => {
      setValves(snap.val() || {});
    });

    return () => off(valvesRef);
  }, [deviceId]);

  // ➕ ADD VALVE
  const handleAddValve = async () => {
    if (!deviceId) return;

    const count = Object.keys(valves).length;

    if (count >= MAX_VALVES) {
      setMessage("⚠️ Max 16 valves reached");
      return;
    }

    const valveId = `valve${count + 1}`;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/valves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          valveId,
          desiredState: false,
          label: `Valve ${count + 1}`,
          location: `Field ${count + 1}`,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setMessage(`✅ ${valveId} added successfully`);
    } catch {
      setMessage("❌ Failed to add valve");
    }

    setLoading(false);
  };

  // 🔘 TOGGLE VALVE
  const toggleValve = async (valveId: string, newState: boolean) => {
    if (!deviceId) return;

    await update(ref(getClientDb(), `devices/${deviceId}/valves/${valveId}`), {
      desiredState: newState,
      desiredAt: Date.now(),
    });
  };

  if (!deviceId) {
    return <div className="p-6">📡 No device linked</div>;
  }

  return (
    <div className="p-6 space-y-6">

      {/* ADD BUTTON */}
      <button
        onClick={handleAddValve}
        disabled={loading}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl"
      >
        <Plus size={18} />
        Add Valve
      </button>

      {/* MESSAGE */}
      {message && (
        <div className="text-sm bg-gray-100 p-2 rounded">
          {message}
        </div>
      )}

      {/* VALVES LIST */}
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(valves).map(([id, valve]) => (
          <div
            key={id}
            className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{valve.label || id}</h3>
              <p className="text-xs text-gray-500">
                {valve.location || "No location"}
              </p>
            </div>

            <Switch
              checked={!!valve.desiredState}
              onCheckedChange={(v) => toggleValve(id, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}