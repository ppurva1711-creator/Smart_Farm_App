"use client";
// components/valve-control-screen.tsx
// Adapted for 1-pump system (your relay on D1)
import { useState, useEffect, useCallback } from 'react';
import { Droplet, Clock, Wifi, WifiOff, Power } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import type { Language } from '@/app/context/LanguageContext';
import { getClientDb } from '@/lib/firebase';
import { ref, onValue, off, update, get, set } from 'firebase/database';
import { Switch } from './ui/switch';

const T: Record<string, Record<Language, string>> = {
 title:      { en:"Pump Control",      hi:"पंप नियंत्रण",    mr:"पंप नियंत्रण",   pa:"ਪੰਪ ਕੰਟਰੋਲ",     te:"పంప్ నియంత్రణ",    ta:"பம்ப் கட்டுப்பாடு" },
  subtitle:   { en:"Irrigation pump",   hi:"सिंचाई पंप",      mr:"सिंचन पंप",      pa:"ਸਿੰਚਾਈ ਪੰਪ",      te:"నీటిపారుదల పంప్",  ta:"நீர்ப்பாசன பம்ப்" },
  motorTitle: { en:"Water Pump Motor",  hi:"पानी मोटर",       mr:"पाणी मोटर",      pa:"ਪਾਣੀ ਮੋਟਰ",       te:"నీటి మోటార్",      ta:"நீர் மோட்டார்" },
  motorOn:    { en:"MOTOR ON",          hi:"मोटर चालू",       mr:"मोटर सुरू",      pa:"ਮੋਟਰ ਚਾਲੂ",       te:"మోటార్ ఆన్",       ta:"மோட்டார் ஆன்" },
  motorOff:   { en:"MOTOR OFF",         hi:"मोटर बंद",        mr:"मोटर बंद",       pa:"ਮੋਟਰ ਬੰਦ",        te:"మోటార్ ఆఫ్",      ta:"மோட்டார் ஆஃப்" },
  pump:       { en:"Water Pump",        hi:"पानी का पंप",     mr:"पाण्याचा पंप",   pa:"ਪਾਣੀ ਦਾ ਪੰਪ",     te:"నీటి పంప్",        ta:"நீர் பம்ப்" },
  on:         { en:"RUNNING 💧",        hi:"चालू 💧",         mr:"चालू 💧",        pa:"ਚਾਲੂ 💧",         te:"నడుస్తోంది 💧",    ta:"இயங்குகிறது 💧" },
  off:        { en:"STOPPED",           hi:"बंद",             mr:"बंद",            pa:"ਬੰਦ",             te:"ఆగింది",           ta:"நிறுத்தப்பட்டது" },
  turnOn:     { en:"START Pump",        hi:"पंप शुरू करें",   mr:"पंप सुरू करा",   pa:"ਪੰਪ ਸ਼ੁਰੂ ਕਰੋ",    te:"పంప్ ప్రారంభించు",  ta:"பம்ப் தொடங்கு" },
  turnOff:    { en:"STOP Pump",         hi:"पंप बंद करें",    mr:"पंप बंद करा",    pa:"ਪੰਪ ਬੰਦ ਕਰੋ",     te:"పంప్ ఆపు",         ta:"பம்ப் நிறுத்து" },
  waiting:    { en:"⏳ Sending...",      hi:"⏳ भेज रहे...",   mr:"⏳ पाठवत...",    pa:"⏳ ਭੇਜ...",        te:"⏳ పంపుతోంది...",   ta:"⏳ அனுப்புகிறது..." },
  confirmed:  { en:"✓ Hardware confirmed", hi:"✓ हार्डवेयर पुष्टि", mr:"✓ पुष्टी", pa:"✓ ਪੁਸ਼ਟੀ", te:"✓ నిర్ధారించబడింది", ta:"✓ உறுதிப்படுத்தல்" },
  lastRun:    { en:"Last run",          hi:"आखिरी बार",       mr:"शेवटचे",         pa:"ਆਖਰੀ ਵਾਰ",       te:"చివరి సారి",       ta:"கடைசி நேரம்" },
  noDevice:   { en:"No device linked",  hi:"डिवाइस नहीं",     mr:"डिव्हाइस नाही",  pa:"ਡਿਵਾਈਸ ਨਹੀਂ",     te:"పరికరం లేదు",      ta:"சாதனம் இல்லை" },
  today:      { en:"Used today",        hi:"आज उपयोग",        mr:"आज वापर",        pa:"ਅੱਜ ਵਰਤੋਂ",       te:"నేడు వాడారు",      ta:"இன்று பயன்பாடு" },
};
function tl(key: string, lang: Language): string { return T[key]?.[lang] ?? T[key]?.en ?? key; }

interface MotorData {
  desiredState: boolean;
  hardwareState: boolean | null;
  lastConfirmed: number | null;
}

export function ValveControlScreen() {
  const { language } = useLanguage();
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('sf_device_id') : null;

  const [pumpData,  setPumpData]  = useState<Record<string, unknown>>({});
  const [connected, setConnected] = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const [water,     setWater]     = useState({ totalLitres:0, tankCapacityLitres:2000 });
  const [motor,     setMotor]     = useState<MotorData>({ desiredState: false, hardwareState: null, lastConfirmed: null });
  const [motorBusy, setMotorBusy] = useState(false);
  const [error, setError] = useState('')

  useEffect(() => {
    if (!deviceId) return;
    const db    = getClientDb();
    const today = new Date().toISOString().slice(0, 10);

    const pRef = ref(db, `devices/${deviceId}/valves/valve1`);
    onValue(pRef, snap => {
      setPumpData(snap.val() ?? {});
      setConnected(true);
    }, () => setConnected(false));

    const wRef = ref(db, `devices/${deviceId}/waterUsage/daily/${today}`);
    onValue(wRef, snap => {
      const d = snap.val();
      if (d) setWater({ totalLitres:d.totalLitres??0, tankCapacityLitres:d.tankCapacityLitres??2000 });
    });

    return () => { off(pRef); off(wRef); };
  }, [deviceId]);

  // ── Real-time motor listener ─────────────────────────────────
  useEffect(() => {
    if (!deviceId) return;
    const db = getClientDb();
    const r  = ref(db, `devices/${deviceId}/motor`);

    onValue(r, async (snap) => {
      const data = snap.val();
      if (!data) {
        const defaults = { desiredState: false, hardwareState: null, lastConfirmed: null };
        await update(ref(db, `devices/${deviceId}/motor`), defaults);
        setMotor(defaults);
      } else {
        setMotor({
          desiredState: !!data.desiredState,
          hardwareState: typeof data.hardwareState === "boolean" ? data.hardwareState : null,
          lastConfirmed: data.lastConfirmed ?? null,
        });
      }
    });

    return () => off(r);
  }, [deviceId]);

  const handleMotorToggle = useCallback(async (newState: boolean) => {
    if (!deviceId) return;
    setMotorBusy(true);
    setError("");
    try {
      await update(ref(getClientDb(), `devices/${deviceId}/motor`), {
        desiredState: newState,
        desiredAt: Date.now(),
      });
    } catch (e: unknown) {
      setError("Failed to toggle motor: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setTimeout(() => setMotorBusy(false), 600);
    }
  }, [deviceId]);


  const isOn       = !!(pumpData.desiredState);
  const isSynced   = pumpData.hardwareState === pumpData.desiredState;
  const lastConfirmed = pumpData.lastConfirmed as number | null ?? null;

  const handleToggle = async (newState: boolean) => {
    if (!deviceId || toggling) return;
    setToggling(true);
    try {
      const db = getClientDb();
      const now = Date.now();

      await update(ref(db, `devices/${deviceId}/valves/valve1`), {
        desiredState: newState,
        desiredAt:    now,
        label:        "Water Pump",
        flowRateLPM:  10,
        ...(newState ? { openedAt:now, closedAt:null } : { closedAt:now }),
      });

      // Water tracking when stopping
      if (!newState && pumpData.openedAt) {
        const openedAt    = pumpData.openedAt as number;
        const durationMin = (now - openedAt) / 60000;
        const litres      = Math.round(durationMin * 10);
        const dateKey     = new Date(now).toISOString().slice(0, 10);
        const sumRef      = ref(db, `devices/${deviceId}/waterUsage/daily/${dateKey}`);
        const sumSnap     = await get(sumRef);
        const sum         = sumSnap.val() ?? { totalLitres:0 };
        const newTotal    = (sum.totalLitres ?? 0) + litres;
        await set(sumRef, {
          date:dateKey, totalLitres:newTotal, tankCapacityLitres:water.tankCapacityLitres,
          ratioPercent:Math.min(100,Math.round((newTotal/water.tankCapacityLitres)*100)),
          byValve:{ valve1:newTotal },
        });
      }
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setToggling(false), 1000); }
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return "never";
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m} min ago`;
    return `${Math.floor(m/60)}h ago`;
  };

  if (!deviceId) {
    return (
      <div className="bg-[#F4F8F4] min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-700 text-center">{tl("noDevice", language)}</h2>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tl("title", language)}</h1>
            <p className="text-white/80 text-sm mt-1">{tl("subtitle", language)}</p>
          </div>
          {connected ? <Wifi className="w-5 h-5 text-green-300" /> : <WifiOff className="w-5 h-5 text-red-300" />}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
       )}

      <div className="px-4 py-6 space-y-4">
   
   /* Motor */
        <div className="px-4 pt-6">
        <div className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${motor.desiredState ? 'border-2 border-[#2E7D32]' : 'border border-gray-100'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-3 ${motor.desiredState ? 'bg-[#E8F5E9]' : 'bg-[#EEEEEE]'}`}>
                <Power className={`w-6 h-6 ${motor.desiredState ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-[#263238] text-base">{tl("motorTitle", language)}</h3>
                <p className="text-sm text-[#90A4AE]">Pump relay control</p>
              </div>
            </div>
            <Switch
              checked={motor.desiredState}
              disabled={motorBusy}
              onCheckedChange={handleMotorToggle}
            />
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E8EFE8]">
            <div className={`w-2 h-2 rounded-full ${motor.desiredState ? 'bg-[#2E7D32]' : 'bg-[#90A4AE]'}`} />
            <span className={`text-sm font-medium ${motor.desiredState ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`}>
              {motor.desiredState ? tl("motorOn", language) : tl("motorOff", language)}
            </span>
            <span className="ml-auto text-xs text-gray-400">
              {motorBusy ? "..." : (motor.hardwareState !== null
                ? (motor.hardwareState === motor.desiredState ? tl("confirmed", language) : tl("pending", language))
                : tl("pending", language))}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-[#90A4AE]">
            <Clock className="w-4 h-4" />
            <span>{tl("lastActive", language)}: {formatTime(motor.lastConfirmed)}</span>
          </div>
        </div>
      </div>
        {/* Main pump card */}
        <div className={`rounded-2xl p-6 shadow-sm border-2 transition-all ${isOn ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`rounded-2xl p-4 ${isOn ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Power className={`w-10 h-10 ${isOn ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#263238]">{tl("pump", language)}</h2>
              <p className={`text-base font-semibold ${isOn ? 'text-blue-600' : 'text-gray-500'}`}>
                {isOn ? tl("on", language) : tl("off", language)}
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full ${isOn ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
          </div>

          {/* Big toggle buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleToggle(true)}
              disabled={isOn || toggling}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl py-4 text-base transition-all shadow-sm">
              ▶ {tl("turnOn", language)}
            </button>
            <button
              onClick={() => handleToggle(false)}
              disabled={!isOn || toggling}
              className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-gray-100 disabled:text-gray-300 text-white font-bold rounded-2xl py-4 text-base transition-all shadow-sm">
              ■ {tl("turnOff", language)}
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tl("lastRun", language)}: {formatTime(lastConfirmed)}
            </span>
            <span className="text-xs text-gray-500">
              {toggling ? tl("waiting", language) : (pumpData.hardwareState !== null ? (isSynced ? tl("confirmed", language) : tl("waiting", language)) : tl("waiting", language))}
            </span>
          </div>
        </div>

        {/* Water used today */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-[#E3F2FD] rounded-xl p-3"><Droplet className="w-6 h-6 text-[#1565C0]" /></div>
            <p className="text-sm text-[#90A4AE]">{tl("today", language)}</p>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{water.totalLitres} L</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div className="bg-[#1565C0] h-2 rounded-full"
              style={{ width:`${Math.min(100, Math.round((water.totalLitres/water.tankCapacityLitres)*100))}%` }} />
          </div>
          <p className="text-xs text-[#90A4AE] mt-1">
            of {water.tankCapacityLitres}L tank capacity
          </p>
        </div>

        {/* How pump responds to app */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-800 text-sm font-medium mb-2">ℹ️ How it works</p>
          <ul className="text-amber-700 text-xs space-y-1">
            <li>• Tap START/STOP above — command sent to Firebase</li>
            <li>• Hardware reads Firebase every 5 seconds</li>
            <li>• Relay on D1 (GPIO5) turns pump ON/OFF</li>
            <li>• "✓ Confirmed" appears when hardware responds</li>
            <li>• SMS "ON" / "OFF" also controls pump directly</li>
          </ul>
        </div>

      </div>
    </div>
  );
}