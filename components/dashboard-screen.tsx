"use client";
// components/dashboard-screen.tsx
// Adapted for 1-pump system (valve1 = your pump relay)
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AlertTriangle, Droplet, Thermometer, Wind, Zap, Battery, MapPin, Wifi, WifiOff, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/context/LanguageContext';
import { t } from '@/lib/i18n';
import { LanguageSelector } from './language-selector';
import { getClientDb } from '@/lib/firebase';
import { ref, onValue, off, set, update, push, remove } from 'firebase/database';

// Translations for pump-specific labels
const P: Record<string, Record<string, string>> = {
  pumpOn:    { en:"Pump ON 💧",  hi:"पंप चालू 💧",  mr:"पंप चालू 💧",  pa:"ਪੰਪ ਚਾਲੂ 💧",  te:"పంప్ ఆన్ 💧",  ta:"பம்ப் ஆன் 💧" },
  pumpOff:   { en:"Pump OFF",    hi:"पंप बंद",      mr:"पंप बंद",      pa:"ਪੰਪ ਬੰਦ",      te:"పంప్ ఆఫ్",     ta:"பம்ப் ஆஃப்" },
  turnOn:    { en:"Turn Pump ON",hi:"पंप चालू करें",mr:"पंप चालू करा", pa:"ਪੰਪ ਚਾਲੂ ਕਰੋ", te:"పంప్ ఆన్ చేయి",ta:"பம்ப் ஆன் செய்" },
  turnOff:   { en:"Turn Pump OFF",hi:"पंप बंद करें",mr:"पंप बंद करा",  pa:"ਪੰਪ ਬੰਦ ਕਰੋ",  te:"పంప్ ఆఫ్ చేయి",ta:"பம்ப் ஆஃப் செய்" },
  soilDry:   { en:"🔴 Dry — Watering needed",hi:"सूखी — पानी चाहिए",mr:"कोरडी — पाणी द्या",pa:"ਸੁੱਕਾ — ਪਾਣੀ ਦਿਓ",te:"పొడి — నీరు అవసరం",ta:"வறண்டது — நீர் தேவை" },
  soilOk:    { en:"🟢 Moist — Good",hi:"नम — अच्छा",mr:"ओलसर — ठीक",pa:"ਨਮੀ — ਠੀਕ",te:"తేమ — మంచిది",ta:"ஈரமான — நல்லது" },
  soilWet:   { en:"🔵 Wet — Stop watering",hi:"गीला — बंद करें",mr:"ओले — बंद करा",pa:"ਗਿੱਲਾ — ਬੰਦ ਕਰੋ",te:"తడి — ఆపండి",ta:"நனைவு — நிறுத்துங்கள்" },
  waterUsed: { en:"Water Used Today",hi:"आज पानी उपयोग",mr:"आजचा पाणी वापर",pa:"ਅੱਜ ਪਾਣੀ ਵਰਤੋਂ",te:"నేడు నీటి వినియోగం",ta:"இன்று நீர் பயன்பாடு" },
  autoMode:  { en:"AUTO (soil sensor)",hi:"ऑटो (मिट्टी सेंसर)",mr:"ऑटो (माती सेंसर)",pa:"ਆਟੋ",te:"ఆటో",ta:"தானியங்கி" },
  manMode:   { en:"MANUAL (app control)",hi:"मैनुअल (ऐप नियंत्रण)",mr:"मॅन्युअल (ऐप)",pa:"ਮੈਨੁਅਲ",te:"మాన్యువల్",ta:"கைமுறை" },
};
function p(key: string, lang: string): string { return P[key]?.[lang] ?? P[key]?.en ?? key; }


export function DashboardScreen() {
  const { language } = useLanguage();
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('sf_device_id') : null;
  const uid      = typeof window !== 'undefined' ? localStorage.getItem('sf_uid')       : null;

  const [sensors,    setSensors]    = useState<Record<string, number | null>>({});
  const [pumpState,  setPumpState]  = useState(false);
  const [water,      setWater]      = useState({ totalLitres:0, tankCapacityLitres:2000, ratioPercent:0 });
  const [location,   setLocation]   = useState<{lat:number;lng:number}|null>(null);
  const [locPending, setLocPending] = useState(false);
  const [powerCut,   setPowerCut]   = useState(false);
  const [isStale,    setIsStale]    = useState(false);
  const [connected,  setConnected]  = useState(false);
  const [userName,   setUserName]   = useState("Farmer");
  const [toggling,   setToggling]   = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const db    = getClientDb();
    const today = new Date().toISOString().slice(0, 10);
    const refs: ReturnType<typeof ref>[] = [];

    // Sensors (temperature, humidity, soilMoisture, battery)
    const sRef = ref(db, `devices/${deviceId}/sensors`);
    // ── Schedules ─────────────────────────────
const schRef = ref(db, `devices/${deviceId}/schedules`);

refs.push(schRef);

onValue(schRef, (snap) => {

  const data = snap.val();

  if (!data) {
    setSchedules([]);
    return;
  }

  const arr = Object.entries(data).map(([id, value]: any) => ({
    id,
    ...value
  }));

  // newest first
  arr.reverse();

  setSchedules(arr);
});

    refs.push(sRef);
    onValue(sRef, snap => {
      const d = snap.val() ?? {};
      setSensors(d);
      setConnected(true);
      setIsStale(d.timestamp ? Date.now() - d.timestamp > 180000 : true);
      setPowerCut((d.battery ?? 100) < 20);
    }, () => setConnected(false));

    // Pump state (valve1 = your pump)
    const vRef = ref(db, `devices/${deviceId}/valves/valve1`);
onValue(vRef, snap => {
  const d = snap.val();

  if (d) {
    // 🔥 Prefer hardwareState if ESP writes it
    if (d.hardwareState !== undefined && d.hardwareState !== null) {
      setPumpState(!!d.hardwareState);
    } else {
      setPumpState(!!d.desiredState);
    }
  }
});

    // Water usage today
    // Water usage
const wRef = ref(db, `devices/${deviceId}/waterUsage`);

refs.push(wRef);

onValue(wRef, snap => {
  const d = snap.val() ?? {};

  const total = d.totalLitres ?? 0;
  const tank  = 2000;

  setWater({
    totalLitres: total,
    tankCapacityLitres: tank,
    ratioPercent: Math.min(100, Math.round((total / tank) * 100))
  });
});

    // Location
    const lRef = ref(db, `devices/${deviceId}/location`);
    refs.push(lRef);
    onValue(lRef, snap => {
      const d = snap.val();
      if (d?.lat !== undefined && d?.lng !== undefined) { setLocation({lat:d.lat, lng:d.lng}); setLocPending(!!d.pending); }
    });

    return () => refs.forEach(r => off(r));
  }, [deviceId]);

  useEffect(() => {
    if (!uid) return;
    const db = getClientDb();
    const r  = ref(db, `users/${uid}/profile/fullName`);
    onValue(r, snap => { if (snap.val()) setUserName(snap.val()); });
    return () => off(r);
  }, [uid]);

  // ── Toggle pump ON/OFF ──────────────────────────────────────
const togglePump = async (newState: boolean) => {
  if (!deviceId || toggling) return;

  setToggling(true);

  try {
    const db = getClientDb();
    const now = Date.now();

    // 🔥 FULL WRITE (IMPORTANT FOR ESP DETECTION)
    await set(ref(db, `devices/${deviceId}/valves/valve1`), {
      desiredState: newState,
      hardwareState: null, // ESP will update this
      desiredAt: now,
      lastCommand: newState ? "ON" : "OFF",
      updatedAt: now
    });

    console.log("🔥 Pump command sent:", newState);

  } catch (e) {
    console.error("❌ Pump error:", e);
  }

  setTimeout(() => setToggling(false), 1000);
};
  // ── Request location ────────────────────────────────────────
  const requestLocation = async () => {
    if (!deviceId) return;
    setLocPending(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude:lat, longitude:lng } = pos.coords;
          setLocation({ lat, lng });
          const db = getClientDb();
          await set(ref(db, `devices/${deviceId}/location`), {
            lat, lng, source:'browser-gps', timestamp:Date.now(), pending:false,
          });
          setLocPending(false);
        }, () => setLocPending(false));
      } else { setLocPending(false); }
    } catch { setLocPending(false); }
  };

  // ── Soil moisture status ────────────────────────────────────
  const getSoilStatus = (val: number | null | undefined) => {
    if (val == null) return { text:'---', color:'bg-gray-100 text-gray-400' };
    const pct = Math.round((1 - val/1023) * 100);
    if (pct < 30)  return { text:p('soilDry', language), color:'bg-red-100 text-red-700',    pct };
    if (pct > 70)  return { text:p('soilWet', language), color:'bg-blue-100 text-blue-700',   pct };
    return               { text:p('soilOk',  language), color:'bg-green-100 text-green-700', pct };
  };

  const soil    = sensors.soilMoisture as number | null ?? null;
  const temp    = sensors.temperature  as number | null ?? null;
  const hum     = sensors.humidity     as number | null ?? null;
  const bat     = sensors.battery      as number ?? 0;
  const batV    = sensors.batteryVoltage as number ?? 0;
  const soilStatus = getSoilStatus(soil);
  const batColor   = bat > 50 ? 'text-green-300' : bat > 20 ? 'text-orange-400' : 'text-red-400';

  if (!deviceId) {
    return (
      <div className="bg-[#F4F8F4] min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-700 text-center mb-2">No Device Linked</h2>
        <p className="text-gray-500 text-center text-sm">Complete setup to connect your Smart Farm hardware.</p>
      </div>
    );
  }

const saveSchedule = async () => {

  if (!deviceId || !fromTime || !toTime)
    return;

  setSavingSchedule(true);

  try {

    const db = getClientDb();

    // ✅ CORRECT PATH
    const schedulesRef =
      ref(db, `devices/${deviceId}/schedules`);

    // ✅ CREATE NEW SCHEDULE
    await push(schedulesRef, {
      enabled: true,
      start: fromTime,
      end: toTime,
      createdAt: Date.now()
    });

    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 3000);

    setShowSchedule(false);

    setFromTime("");
    setToTime("");

  } catch (err) {

    console.error("Schedule error:", err);

  }

  setSavingSchedule(false);
};

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t('welcome', language)}, {userName}</h1>
            <p className="text-white/80 text-sm mt-1">{t('smart_farm_control', language)}</p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? <Wifi className="w-5 h-5 text-green-300" /> : <WifiOff className="w-5 h-5 text-red-300" />}
            <LanguageSelector />
          </div>
        </div>
        {isStale && connected && (
          <div className="mt-2 bg-yellow-500/30 rounded-xl px-3 py-1.5 text-xs text-yellow-100">
            ⚠️ Data over 3 min old — check hardware connection
          </div>
        )}
        {sensors.battery != null && (
          <div className="mt-3 flex items-center gap-2">
            <Battery className={`w-4 h-4 ${batColor}`} />
            <div className="flex-1 bg-green-900 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${bat>50?'bg-green-300':bat>20?'bg-orange-400':'bg-red-400'}`}
                style={{ width:`${bat}%` }} />
            </div>
            <span className="text-xs text-green-200">{bat}% ({batV}V)</span>
          </div>
        )}
      </div>

{/* ── SCHEDULE BUTTON (NEW) ── */}
<div className="bg-white rounded-2xl p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="bg-purple-100 rounded-xl p-3">
        <Clock className="w-6 h-6 text-purple-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#263238]">Schedule Pump</p>
        <p className="text-xs text-gray-500">Set automatic timing</p>
      </div>
    </div>

    <button
      onClick={() => setShowSchedule(true)}
      className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm"
    >
      Set Time
    </button>
  </div>
</div>
      {powerCut && (
        <div className="mx-4 mt-4 bg-[#E53935] rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
          <div className="text-white">
            <p className="font-semibold">{t('power_cut_alert', language)}</p>
            <p className="text-sm text-white/90">{t('currently_experiencing_power_cut', language)}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-6 space-y-4">

        {/* ── PUMP CONTROL CARD (Most Important) ── */}
        <div className={`rounded-2xl p-5 shadow-sm transition-all border-2 ${pumpState ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-3 ${pumpState ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Power className={`w-7 h-7 ${pumpState ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-bold text-[#263238] text-lg">Water Pump</h3>
                <p className={`text-sm font-medium ${pumpState ? 'text-blue-600' : 'text-gray-400'}`}>
                  {pumpState ? p('pumpOn', language) : p('pumpOff', language)}
                </p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full ${pumpState ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => togglePump(true)}
              disabled={pumpState || toggling}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 transition-all">
              {p('turnOn', language)}
            </button>
            <button
              onClick={() => togglePump(false)}
              disabled={!pumpState || toggling}
              className="flex-1 bg-white hover:bg-red-50 disabled:bg-gray-50 disabled:text-gray-300 border-2 border-red-400 disabled:border-gray-200 text-red-600 font-semibold rounded-xl py-3 transition-all">
              {p('turnOff', language)}
            </button>
          </div>
          {toggling && (
            <p className="text-center text-xs text-blue-500 mt-2">
              Sending command to hardware... (up to 5 seconds)
            </p>
          )}
        </div>

        {/* ── Soil Moisture ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E8F5E9] rounded-xl p-3"><Droplet className="w-6 h-6 text-[#2E7D32]" /></div>
              <p className="text-sm text-[#90A4AE]">{t('soil_moisture', language)}</p>
            </div>
            <Badge className={soilStatus.color}>{soilStatus.text}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">
            {soil != null ? `${Math.round((1 - soil/1023)*100)}%` : '---'}
          </p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div className="bg-[#2E7D32] h-2 rounded-full transition-all"
              style={{ width:`${soil != null ? Math.round((1 - soil/1023)*100) : 0}%` }} />
          </div>
          <p className="text-xs text-[#90A4AE] mt-1">ADC: {soil ?? '---'} / 1023</p>
        </div>

        {/* ── Temperature ── */}
        {temp != null && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#FFF3E0] rounded-xl p-3"><Thermometer className="w-6 h-6 text-[#F57C00]" /></div>
                <p className="text-sm text-[#90A4AE]">{t('temperature', language)}</p>
              </div>
              <Badge className={temp > 35 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                {temp > 35 ? t('high', language) : t('normal', language)}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-[#263238]">{temp}°C</p>
          </div>
        )}

        {/* ── Water Used Today ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E3F2FD] rounded-xl p-3"><Zap className="w-6 h-6 text-[#1565C0]" /></div>
              <p className="text-sm text-[#90A4AE]">{p('waterUsed', language)}</p>
            </div>
            <Badge className={pumpState ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}>
              {pumpState ? '🔵 Flowing' : '⚫ Stopped'}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">
  {water.totalLitres.toFixed(1)}L
</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div className="bg-[#1565C0] h-2 rounded-full" style={{ width:`${Math.min(water.ratioPercent,100)}%` }} />
          </div>
          <p className="text-xs text-[#90A4AE] mt-1">
            {water.totalLitres}L / {water.tankCapacityLitres}L capacity ({water.ratioPercent}% used)
          </p>
        </div>
{/* ── SCHEDULE MODAL (NEW) ── */}
{showSchedule && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md">

      <h2 className="text-lg font-bold mb-4">Schedule Pump</h2>

      <div className="mb-3">
        <label className="text-sm text-gray-600">From Time</label>
        <input
          type="time"
          value={fromTime}
          onChange={(e) => setFromTime(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div className="mb-4">
        <label className="text-sm text-gray-600">To Time</label>
        <input
          type="time"
          value={toTime}
          onChange={(e) => setToTime(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mt-1"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={saveSchedule}
          disabled={savingSchedule}
          className="flex-1 bg-purple-600 text-white py-2 rounded-lg"
        >
          {savingSchedule ? "Saving..." : "Save"}
        </button>

        <button
          onClick={() => setShowSchedule(false)}
          className="flex-1 bg-gray-200 py-2 rounded-lg"
        >
          Cancel
        </button>
      </div>

    </div>
  </div>
)}
        {/* ── Location ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#F3E5F5] rounded-xl p-3"><MapPin className="w-6 h-6 text-[#7B1FA2]" /></div>
              <div>
                <p className="text-sm font-medium text-[#263238]">Device Location</p>
                <p className="text-xs text-[#90A4AE]">GPS / Browser</p>
              </div>
            </div>
            <button onClick={requestLocation} disabled={locPending}
              className="bg-[#7B1FA2] text-white text-xs rounded-xl px-3 py-2 disabled:bg-gray-300">
              {locPending ? 'Locating...' : 'Get Location'}
            </button>
          </div>
          {location ? (
            <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm text-[#7B1FA2] underline">
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)} — Open Maps
            </a>
          ) : (
            <p className="text-xs text-[#90A4AE]">{locPending ? 'Fetching GPS...' : 'Tap Get Location'}</p>
          )}
        </div>

            {/* ── ALL SCHEDULES ── */}
      {schedules.length > 0 && (

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-200">

          <p className="text-sm text-gray-500 mb-3">
            Scheduled Timings
          </p>

          <div className="space-y-3">

            {schedules.map((s) => (

              <div
                key={s.id}
                className="bg-purple-50 rounded-xl px-4 py-3 flex items-center justify-between"
              >

                <div>

                  <p className="text-lg font-bold text-purple-700">
                    ⏰ {s.start} → {s.end}
                  </p>

                  <p className="text-xs text-gray-500">
                    {s.enabled ? "Enabled" : "Disabled"}
                  </p>

                </div>

                <button
                  onClick={async () => {

                    const db = getClientDb();

                    await remove(
                      ref(
                        db,
                        `devices/${deviceId}/schedules/${s.id}`
                      )
                    );

                  }}
                  className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm"
                >
                  Delete
                </button>

              </div>

            ))}

          </div>

        </div>

      )}

            </div>
    </div>
  );
}