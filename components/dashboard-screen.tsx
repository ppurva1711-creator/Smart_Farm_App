"use client";

// components/dashboard-screen.tsx
// PREMIUM WARM UI VERSION

import {
  Clock,
  AlertTriangle,
  Droplet,
  Thermometer,
  Zap,
  Battery,
  MapPin,
  Wifi,
  WifiOff,
  Power,
  Sun,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/app/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LanguageSelector } from "./language-selector";
import { getClientDb } from "@/lib/firebase";
import {
  ref,
  onValue,
  off,
  set,
  push,
  remove,
} from "firebase/database";

// ---------------- TRANSLATIONS ----------------

const P: Record<string, Record<string, string>> = {
  pumpOn: { en: "Pump ON 💧" },
  pumpOff: { en: "Pump OFF" },
  turnOn: { en: "Turn Pump ON" },
  turnOff: { en: "Turn Pump OFF" },
  waterUsed: { en: "Water Used Today" },
};

function p(key: string, lang: string): string {
  return P[key]?.[lang] ?? P[key]?.en ?? key;
}

export function DashboardScreen() {
  const { language } = useLanguage();

  const deviceId =
    typeof window !== "undefined"
      ? localStorage.getItem("sf_device_id")
      : null;

  const uid =
    typeof window !== "undefined"
      ? localStorage.getItem("sf_uid")
      : null;

  const [sensors, setSensors] = useState<Record<string, number | null>>({});
  const [pumpState, setPumpState] = useState(false);

  const [water, setWater] = useState({
    totalLitres: 0,
    tankCapacityLitres: 2000,
    ratioPercent: 0,
  });

  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [locPending, setLocPending] = useState(false);
  const [powerCut, setPowerCut] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState("Farmer");
  const [toggling, setToggling] = useState(false);

  const [solarPercent, setSolarPercent] = useState(0);
  const [solarMode, setSolarMode] = useState(true);

  const [showSchedule, setShowSchedule] = useState(false);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [scheduleCount, setScheduleCount] = useState(1);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [showToast, setShowToast] = useState(false);

  // ---------------- FIREBASE ----------------

  useEffect(() => {
    if (!deviceId) return;

    const db = getClientDb();
    const refs: any[] = [];

    // SENSOR DATA

    const sRef = ref(db, `devices/${deviceId}/sensors`);
    refs.push(sRef);

    onValue(
      sRef,
      (snap) => {
        const d = snap.val() ?? {};

        setSensors(d);

        const ts =
          d.timestamp ||
          d.updatedAt ||
          d.lastUpdate;

        if (ts) {
          const stale =
            Date.now() - ts > 180000;

          setIsStale(stale);
          setConnected(!stale);
        } else {
          setConnected(false);
        }
      },
      (err) => {
        console.error("Sensor listener error", err);
        setConnected(false);
      }
    );

    // SOLAR

    const solarRef = ref(
      db,
      `devices/${deviceId}/solarPercent`
    );

    refs.push(solarRef);

    onValue(solarRef, (snap) => {
      setSolarPercent(
        Math.max(
          0,
          Math.min(
            100,
            Number(snap.val() || 0)
          )
        )
      );
    });

    // PUMP

    const vRef = ref(
      db,
      `devices/${deviceId}/valves/valve1`
    );

    refs.push(vRef);

    onValue(vRef, (snap) => {
      const d = snap.val();

      if (!d) {
        setPumpState(false);
        return;
      }

      if (
        d.hardwareState !== undefined &&
        d.hardwareState !== null
      ) {
        setPumpState(!!d.hardwareState);
      } else {
        setPumpState(!!d.desiredState);
      }
    });

    // WATER

    const wRef = ref(
      db,
      `devices/${deviceId}/waterUsage`
    );

    refs.push(wRef);

    onValue(wRef, (snap) => {
      const d = snap.val() ?? {};

      const total = d.totalLitres ?? 0;
      const tank = 2000;

      setWater({
        totalLitres: total,
        tankCapacityLitres: tank,
        ratioPercent: Math.min(
          100,
          Math.round((total / tank) * 100)
        ),
      });
    });

    // POWER MODE

    const powerRef = ref(
      db,
      `devices/${deviceId}/powerMode`
    );

    refs.push(powerRef);

    onValue(powerRef, (snap) => {
      const mode = snap.val();

      setSolarMode(mode !== "battery");
    });

    // POWER CUT

    const powerCutRef = ref(
      db,
      `devices/${deviceId}/powerCut`
    );

    refs.push(powerCutRef);

    onValue(powerCutRef, (snap) => {
      setPowerCut(!!snap.val());
    });

    // LOCATION

    const lRef = ref(
      db,
      `devices/${deviceId}/location`
    );

    refs.push(lRef);

    onValue(lRef, (snap) => {
      const d = snap.val();

      if (
        d?.lat !== undefined &&
        d?.lng !== undefined
      ) {
        setLocation({
          lat: d.lat,
          lng: d.lng,
        });

        setLocPending(!!d.pending);
      }
    });

    // SCHEDULES

    const schRef = ref(
      db,
      `devices/${deviceId}/schedules`
    );

    refs.push(schRef);

    onValue(schRef, (snap) => {
      const data = snap.val();

      if (!data) {
        setSchedules([]);
        return;
      }

      const arr = Object.entries(data).map(
        ([id, value]: any) => ({
          id,
          ...value,
        })
      );

      arr.sort((a, b) =>
        (b.start || "").localeCompare(
          a.start || ""
        )
      );

      setSchedules(arr);
    });

    return () => {
      refs.forEach((r) => off(r));
    };
  }, [deviceId]);

  // USER NAME

  useEffect(() => {
    if (!uid) return;

    const db = getClientDb();

    const r = ref(
      db,
      `users/${uid}/profile/fullName`
    );

    onValue(r, (snap) => {
      if (snap.val()) setUserName(snap.val());
    });

    return () => off(r);
  }, [uid]);

  // ---------------- VALUES ----------------

  const temp =
    sensors.temperature != null
      ? Number(sensors.temperature)
      : null;

  const bat = Number(sensors.battery || 0);

  const batV = Number(
    sensors.batteryVoltage || 0
  );

  // ---------------- FUNCTIONS ----------------

  const togglePump = async (
    newState: boolean
  ) => {
    if (!deviceId || toggling) return;

    setToggling(true);

    try {
      const db = getClientDb();
      const now = Date.now();

      await set(
        ref(
          db,
          `devices/${deviceId}/valves/valve1`
        ),
        {
          desiredState: newState,
          hardwareState: null,
          desiredAt: now,
          lastCommand: newState
            ? "ON"
            : "OFF",
          updatedAt: now,
        }
      );
    } catch (e) {
      console.error(e);
    }

    setTimeout(
      () => setToggling(false),
      1000
    );
  };

  const togglePowerSource =
    async () => {
      if (!deviceId) return;

      try {
        const db = getClientDb();

        const newMode = solarMode
          ? "battery"
          : "solar";

        await set(
          ref(
            db,
            `devices/${deviceId}/powerMode`
          ),
          newMode
        );

        setSolarMode(!solarMode);
      } catch (err) {
        console.error(err);
      }
    };

    const saveSchedule = async () => {

  if (!deviceId || !fromTime || !toTime)
    return;

  setSavingSchedule(true);

  // END TIME CHECK

  if (fromTime >= toTime) {

    alert(
      "End time must be after start time"
    );

    setSavingSchedule(false);

    return;
  }

  // MAX SCHEDULE LIMIT

  if (schedules.length >= scheduleCount) {

    alert(
      `Maximum ${scheduleCount} schedule${
        scheduleCount > 1 ? "s" : ""
      } allowed`
    );

    setSavingSchedule(false);

    return;
  }

  // OVERLAP CHECK

  const overlaps = schedules.some((s) => {

    return (
      fromTime < s.end &&
      toTime > s.start
    );

  });

  if (overlaps) {

    alert(
      "Schedule overlaps with existing schedule"
    );

    setSavingSchedule(false);

    return;
  }

  try {

    const db = getClientDb();

    const schedulesRef = ref(
      db,
      `devices/${deviceId}/schedules`
    );

    // SAVE TO FIREBASE

    await push(schedulesRef, {

      enabled: true,

      start: fromTime,

      end: toTime,

      createdAt: Date.now()

    });

    // SUCCESS

    setShowToast(true);

    setTimeout(() => {

      setShowToast(false);

    }, 3000);

    // CLOSE MODAL

    setShowSchedule(false);

    // RESET

    setFromTime("");

    setToTime("");

  } catch (err) {

    console.error(
      "Schedule error:",
      err
    );

  }

  setSavingSchedule(false);

};

const updateScheduleCount = async (
  count: number
) => {

  if (!deviceId) return;

  const db = getClientDb();

  let remainingSchedules = [
    ...schedules
  ];

  while (
    remainingSchedules.length > count
  ) {

    const sch =
      remainingSchedules[
        remainingSchedules.length - 1
      ];

    const ok = confirm(
      `Delete schedule ${sch.start} → ${sch.end}?`
    );

    if (!ok) {

      alert(
        `Maximum ${count} schedules allowed`
      );

      return;
    }

    await remove(
      ref(
        db,
        `devices/${deviceId}/schedules/${sch.id}`
      )
    );

    remainingSchedules.pop();

  }

  setScheduleCount(count);

};

  // ---------------- UI ----------------

  return (
    <div className="min-h-screen bg-[#FFF8F1] pb-24">

      {/* HEADER */}

      <div className="bg-gradient-to-br from-[#B86B34] via-[#D98952] to-[#F4B183] text-white px-6 py-7 rounded-b-[35px] shadow-lg">

        <div className="flex items-start justify-between">

          <div>

            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {userName}
            </h1>

            <p className="text-white/80 mt-1 text-sm">
              Smart Irrigation Dashboard
            </p>

          </div>

          <div className="flex items-center gap-3">

            {connected ? (
              <Wifi className="w-5 h-5 text-green-200" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-200" />
            )}

            <LanguageSelector />

          </div>

        </div>

        {/* STATUS */}

        <div className="grid grid-cols-2 gap-4 mt-6">

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">

            <div className="flex items-center justify-between">

              <Battery className="w-6 h-6" />

              <span className="text-sm">
                {bat}%
              </span>

            </div>

            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: `${bat}%`,
                }}
              />
            </div>

            <p className="text-xs mt-2 text-white/80">
              Battery ({batV}V)
            </p>

          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">

            <div className="flex items-center justify-between">

              <Sun className="w-6 h-6" />

              <span className="text-sm">
                {solarPercent}%
              </span>

            </div>

            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-300 rounded-full"
                style={{
                  width: `${solarPercent}%`,
                }}
              />
            </div>

            <p className="text-xs mt-2 text-white/80">
              Solar Efficiency
            </p>

          </div>

        </div>

      </div>

      {/* POWER CUT */}

      {powerCut && (
        <div className="mx-4 mt-5 bg-red-500 text-white rounded-3xl p-4 shadow-lg flex gap-3">

          <AlertTriangle className="w-6 h-6" />

          <div>

            <p className="font-semibold">
              Power Cut Detected
            </p>

            <p className="text-sm text-white/90">
              Running on backup system
            </p>

          </div>

        </div>
      )}

      {/* MAIN CONTENT */}

      <div className="px-4 py-5 space-y-5">

        {/* PUMP CARD */}

        <div className="bg-gradient-to-br from-[#F7E7D3] to-[#FFF4E8] rounded-[30px] p-6 shadow-md border border-[#E9D4BE]">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div className={`p-4 rounded-2xl ${
                pumpState
                  ? "bg-blue-100"
                  : "bg-white"
              }`}>

                <Power className={`w-8 h-8 ${
                  pumpState
                    ? "text-blue-600"
                    : "text-gray-400"
                }`} />

              </div>

              <div>

                <h2 className="text-2xl font-bold text-[#5A3921]">
                  Water Pump
                </h2>

                <p className={`font-medium ${
                  pumpState
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}>
                  {pumpState
                    ? p("pumpOn", language)
                    : p("pumpOff", language)}
                </p>

              </div>

            </div>

            <div className={`w-4 h-4 rounded-full ${
              pumpState
                ? "bg-blue-500 animate-pulse"
                : "bg-gray-300"
            }`} />

          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">

            <button
              onClick={() =>
                togglePump(true)
              }
              disabled={pumpState || toggling}
              className="bg-[#2E7D32] hover:bg-[#256A2A] text-white rounded-2xl py-4 font-semibold transition-all shadow-md"
            >
              Turn ON
            </button>

            <button
              onClick={() =>
                togglePump(false)
              }
              disabled={!pumpState || toggling}
              className="bg-white border-2 border-red-300 text-red-500 rounded-2xl py-4 font-semibold"
            >
              Turn OFF
            </button>

          </div>

        </div>

        {/* TEMPERATURE + WATER */}

        <div className="grid grid-cols-2 gap-4">

          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-[#EFE1D3]">

            <div className="flex items-center justify-between">

              <div className="bg-orange-100 p-3 rounded-2xl">
                <Thermometer className="w-6 h-6 text-orange-500" />
              </div>

              <Badge className="bg-orange-100 text-orange-700 border-none">
                Live
              </Badge>

            </div>

            <p className="text-sm text-gray-500 mt-4">
              Temperature
            </p>

            <h2 className="text-3xl font-bold text-[#4B2E1D] mt-1">
              {temp ?? "--"}°C
            </h2>

          </div>

          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-[#EFE1D3]">

            <div className="flex items-center justify-between">

              <div className="bg-blue-100 p-3 rounded-2xl">
                <Droplet className="w-6 h-6 text-blue-500" />
              </div>

              <Badge className="bg-blue-100 text-blue-700 border-none">
                Usage
              </Badge>

            </div>

            <p className="text-sm text-gray-500 mt-4">
              Water Used
            </p>

            <h2 className="text-3xl font-bold text-[#4B2E1D] mt-1">
              {water.totalLitres.toFixed(1)}L
            </h2>

          </div>

        </div>

        {/* POWER SOURCE */}

        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-[#EFE1D3]">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-xl font-bold text-[#5A3921]">
                Power Source
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {solarMode
                  ? "AUTO (Solar)"
                  : "MANUAL (Battery)"}
              </p>

            </div>

            <button
              onClick={togglePowerSource}
              className={`relative w-16 h-9 rounded-full transition-all ${
                solarMode
                  ? "bg-green-500"
                  : "bg-gray-400"
              }`}
            >
              <span
                className={`absolute top-1 w-7 h-7 bg-white rounded-full transition-all ${
                  solarMode
                    ? "left-8"
                    : "left-1"
                }`}
              />
            </button>

          </div>

        </div>

        {/* SCHEDULES */}
{/* SCHEDULES */}

<div className="bg-white rounded-[30px] p-6 shadow-sm border border-[#EFE1D3]">

  {/* TOP HEADER */}

  <div className="flex items-center justify-between">

    <div className="flex items-center gap-4">

      <div className="bg-purple-100 p-3 rounded-2xl">
        <Clock className="w-6 h-6 text-purple-600" />
      </div>

      <div>

        <h3 className="text-xl font-bold text-[#5A3921]">
          Pump Schedule
        </h3>

        <p className="text-sm text-gray-500">
          Automatic timing control
        </p>

      </div>

    </div>

    <button
      onClick={() => setShowSchedule(true)}
      className="bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white px-5 py-3 rounded-2xl font-semibold shadow-md hover:scale-105 transition-all"
    >
      Add
    </button>

  </div>

  {/* NUMBER OF SCHEDULES */}

  <div className="mt-6">

    <label className="text-sm font-medium text-gray-600 mb-2 block">
      Number of Allowed Schedules
    </label>

    <select
      value={scheduleCount}
      onChange={(e) =>
        updateScheduleCount(
          Number(e.target.value)
        )
      }
      className="w-full border border-[#E9D4BE] bg-[#FFF8F1] rounded-2xl px-4 py-3 text-[#5A3921] outline-none"
    >
      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
        <option key={n} value={n}>
          {n} Schedule{n > 1 ? "s" : ""}
        </option>
      ))}
    </select>

  </div>

  {/* SCHEDULE LIST */}

  {schedules.length > 0 ? (

    <div className="space-y-4 mt-6">

      {schedules.map((s) => (

        <div
          key={s.id}
          className="bg-[#FAF3FF] border border-purple-100 rounded-3xl px-5 py-4 flex justify-between items-center shadow-sm"
        >

          <div>

            <p className="font-bold text-purple-700 text-lg">
              ⏰ {s.start} → {s.end}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Automatic irrigation active
            </p>

          </div>

          <button
            onClick={async () => {

              if (
                !confirm(
                  `Delete schedule ${s.start} → ${s.end}?`
                )
              ) return;

              const db = getClientDb();

              await remove(
                ref(
                  db,
                  `devices/${deviceId}/schedules/${s.id}`
                )
              );

            }}
            className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-2xl text-sm font-medium transition-all"
          >
            Delete
          </button>

        </div>

      ))}

    </div>

  ) : (

    <div className="mt-6 bg-[#FFF8F1] border border-dashed border-[#E9D4BE] rounded-3xl p-8 text-center">

      <Clock className="w-10 h-10 text-purple-400 mx-auto mb-3" />

      <p className="text-[#5A3921] font-semibold">
        No schedules added
      </p>

      <p className="text-sm text-gray-500 mt-1">
        Tap Add to create automatic irrigation timing
      </p>

    </div>

  )}

</div>

{/* SCHEDULE MODAL */}

{showSchedule && (

  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">

    <div className="bg-white rounded-[35px] p-7 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">

      <div className="flex items-center gap-3 mb-6">

        <div className="bg-purple-100 p-3 rounded-2xl">
          <Clock className="w-6 h-6 text-purple-600" />
        </div>

        <div>

          <h2 className="text-2xl font-bold text-[#5A3921]">
            Schedule Pump
          </h2>

          <p className="text-sm text-gray-500">
            Set automatic irrigation timing
          </p>

        </div>

      </div>

      {/* FROM */}

      <div className="mb-5">

        <label className="text-sm font-medium text-gray-600 block mb-2">
          From Time
        </label>

        <input
          type="time"
          value={fromTime}
          onChange={(e) =>
            setFromTime(e.target.value)
          }
          className="w-full border border-[#E9D4BE] bg-[#FFF8F1] rounded-2xl px-4 py-3 outline-none"
        />

      </div>

      {/* TO */}

      <div className="mb-6">

        <label className="text-sm font-medium text-gray-600 block mb-2">
          To Time
        </label>

        <input
          type="time"
          value={toTime}
          onChange={(e) =>
            setToTime(e.target.value)
          }
          className="w-full border border-[#E9D4BE] bg-[#FFF8F1] rounded-2xl px-4 py-3 outline-none"
        />

      </div>

      {/* BUTTONS */}

      <div className="flex gap-4">

        <button
          onClick={saveSchedule}
          disabled={savingSchedule}
          className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white py-3 rounded-2xl font-semibold shadow-md hover:scale-[1.02] transition-all"
        >
          {savingSchedule
            ? "Saving..."
            : "Save Schedule"}
        </button>

        <button
          onClick={() =>
            setShowSchedule(false)
          }
          className="flex-1 bg-[#F3E5F5] text-[#5A3921] py-3 rounded-2xl font-semibold"
        >
          Cancel
        </button>

      </div>

    </div>

  </div>

)}

        {/* LOCATION */}

        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-[#EFE1D3]">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div className="bg-pink-100 p-3 rounded-2xl">
                <MapPin className="w-6 h-6 text-pink-600" />
              </div>

              <div>

                <h3 className="text-xl font-bold text-[#5A3921]">
                  Device Location
                </h3>

                <p className="text-sm text-gray-500">
                  GPS Tracking
                </p>

              </div>

            </div>

          </div>

          {location ? (
            <a
              href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B86B34] underline mt-4 block"
            >
              📍 Open in Google Maps
            </a>
          ) : (
            <p className="text-gray-400 mt-4">
              Location unavailable
            </p>
          )}

        </div>

      </div>
    </div>
  );
}