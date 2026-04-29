"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { getClientDb } from "@/lib/firebase";
import { ref, onValue, off, update } from "firebase/database";
import { Switch } from "./ui/switch";

export function ValveControlScreen() {
  const deviceId =
    typeof window !== "undefined"
      ? localStorage.getItem("sf_device_id")
      : null;

  const [valves, setValves] = useState<any>({});

  useEffect(() => {
    if (!deviceId) return;

    const db = getClientDb();
    const valvesRef = ref(db, `devices/${deviceId}/valves`);

    onValue(valvesRef, (snap) => {
      setValves(snap.val() || {});
    });

    return () => off(valvesRef);
  }, [deviceId]);

  const toggleValve = async (valveId: string, newState: boolean) => {
    if (!deviceId) return;

    await update(ref(getClientDb(), `devices/${deviceId}/valves/${valveId}`), {
      desiredState: newState,
      desiredAt: Date.now(),
    });

    console.log("Valve toggled:", valveId, newState);
  };

  if (!deviceId) return <div>📡 No device</div>;

  return (
    <div className="p-6 space-y-4">
      {Object.entries(valves).map(([id, valve]: any) => (
        <div key={id} className="flex justify-between bg-white p-4 rounded shadow">
          <span>{id}</span>

          <Switch
            checked={!!valve.desiredState}
            onCheckedChange={(v) => toggleValve(id, v)}
          />
        </div>
      ))}
    </div>
  );
}