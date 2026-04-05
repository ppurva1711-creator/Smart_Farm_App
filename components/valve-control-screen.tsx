"use client";
import { useState, useEffect, useCallback } from 'react';
import { Droplet, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/app/context/LanguageContext';
import type { Language } from '@/app/context/LanguageContext';
import { getClientDb } from '@/lib/firebase';
import { ref, onValue, off, update, get } from 'firebase/database';

const T: Record<string, Record<Language, string>> = {
  title:      { en:"Valve Control",    hi:"वाल्व नियंत्रण", mr:"झडप नियंत्रण",   pa:"ਵਾਲਵ ਕੰਟਰੋਲ",   te:"వాల్వ్ నియంత్రణ",  ta:"வால்வு கட்டுப்பாடு" },
  subtitle:   { en:"Irrigation",       hi:"सिंचाई",         mr:"सिंचन",           pa:"ਸਿੰਚਾਈ",         te:"నీటిపారుదల",        ta:"நீர்ப்பாசனம்" },
  valve:      { en:"Valve",            hi:"वाल्व",          mr:"झडप",             pa:"ਵਾਲਵ",           te:"వాల్వ్",            ta:"வால்வு" },
  open:       { en:"OPEN",             hi:"खुला",           mr:"उघडे",            pa:"ਖੁੱਲ੍ਹਾ",         te:"తెరిచి",            ta:"திறந்த" },
  closed:     { en:"CLOSED",           hi:"बंद",            mr:"बंद",             pa:"ਬੰਦ",             te:"మూసివున్న",          ta:"மூடிய" },
  lastActive: { en:"Last active",      hi:"अंतिम सक्रिय",   mr:"शेवटचे सक्रिय",  pa:"ਆਖਰੀ ਸਕਿਰਿਆ",   te:"చివరగా",            ta:"கடைசியாக" },
  turnAllOn:  { en:"Turn All ON",      hi:"सभी खोलें",      mr:"सर्व उघडा",       pa:"ਸਾਰੇ ਖੋਲ੍ਹੋ",    te:"అన్నీ తెరవు",       ta:"அனைத்தும் திற" },
  turnAllOff: { en:"Turn All OFF",     hi:"सभी बंद करें",   mr:"सर्व बंद करा",   pa:"ਸਾਰੇ ਬੰਦ ਕਰੋ",   te:"అన్నీ మూయి",        ta:"அனைத்தும் மூடு" },
  confirmed:  { en:"✓ Confirmed",      hi:"✓ पुष्टि",       mr:"✓ पुष्टी",        pa:"✓ ਪੁਸ਼ਟੀ",        te:"✓ నిర్ధారణ",        ta:"✓ உறுதி" },
  pending:    { en:"⏳ Sending...",     hi:"⏳ भेज रहे...",  mr:"⏳ पाठवत आहे...", pa:"⏳ ਭੇਜਿਆ ਜਾ...", te:"⏳ పంపుతోంది...",   ta:"⏳ அனுப்புகிறது..." },
  noDevice:   { en:"No device linked", hi:"डिवाइस नहीं",   mr:"डिव्हाइस नाही",  pa:"ਕੋਈ ਡਿਵਾਈਸ ਨਹੀਂ",te:"పరికరం లేదు",       ta:"சாதனம் இல்லை" },
  now:        { en:"just now",         hi:"अभी",            mr:"आत्ता",           pa:"ਹੁਣੇ",            te:"ఇప్పుడే",           ta:"இப்போதே" },
};

function tl(key: string, lang: Language): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

interface ValveData {
  desiredState:  boolean;
  hardwareState: boolean | null;
  lastConfirmed: number | null;
  openedAt:      number | null;
  label:         string;
  flowRateLPM:   number;
}

export function ValveControlScreen() {
  const { language } = useLanguage();
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('sf_device_id') : null;

  const [valves,    setValves]    = useState<Record<string, ValveData>>({});
  const [connected, setConnected] = useState(false);
  const [toggling,  setToggling]  = useState<Record<string, boolean>>({});
  const [error,     setError]     = useState("");

  // ── Real-time listener ──────────────────────────────────────
  useEffect(() => {
    if (!deviceId) return;
    const db = getClientDb();
    const r  = ref(db, `devices/${deviceId}/valves`);

    onValue(r, async (snap) => {
      const data = snap.val();
      if (!data) {
        // Create default 4 valves in Firebase
        const defaults = {
          valve1: { desiredState:false, hardwareState:null, lastConfirmed:null, openedAt:null, label:"North Field", flowRateLPM:10 },
          valve2: { desiredState:false, hardwareState:null, lastConfirmed:null, openedAt:null, label:"South Field", flowRateLPM:10 },
          valve3: { desiredState:false, hardwareState:null, lastConfirmed:null, openedAt:null, label:"East Field",  flowRateLPM:10 },
          valve4: { desiredState:false, hardwareState:null, lastConfirmed:null, openedAt:null, label:"West Field",  flowRateLPM:10 },
        };
        await update(ref(db, `devices/${deviceId}/valves`), defaults);
        setValves(defaults as Record<string, ValveData>);
      } else {
        setValves(data);
      }
      setConnected(true);
    }, (err) => {
      setError("Firebase connection failed: " + err.message);
      setConnected(false);
    });

    return () => off(r);
  }, [deviceId]);

  // ── Toggle valve ─────────────────────────────────────────────
  const handleToggle = useCallback(async (valveId: string, newState: boolean) => {
    if (!deviceId) return;
    setToggling(t => ({ ...t, [valveId]: true }));
    setError("");

    try {
      const db  = getClientDb();
      const now = Date.now();

      // Write desired state — hardware picks this up within 5s
      const updates: Record<string, unknown> = {
        [`devices/${deviceId}/valves/${valveId}/desiredState`]: newState,
        [`devices/${deviceId}/valves/${valveId}/desiredAt`]:    now,
      };

      if (newState) {
        // Opening: record start time
        updates[`devices/${deviceId}/valves/${valveId}/openedAt`]  = now;
        updates[`devices/${deviceId}/valves/${valveId}/closedAt`]  = null;
      } else {
        // Closing: calculate water used
        const valve   = valves[valveId];
        const openedAt = valve?.openedAt;
        if (openedAt) {
          const durationMin  = (now - openedAt) / 60000;
          const flowRate     = valve.flowRateLPM ?? 10;
          const litres       = Math.round(durationMin * flowRate);
          const dateKey      = new Date(now).toISOString().slice(0, 10);
          updates[`devices/${deviceId}/valves/${valveId}/closedAt`]  = now;
          updates[`devices/${deviceId}/valves/${valveId}/openedAt`]  = null;

          // Update daily water summary
          const summarySnap = await get(ref(db, `devices/${deviceId}/waterUsage/daily/${dateKey}`));
          const summary     = summarySnap.val() ?? { totalLitres:0, byValve:{} };
          const tankSnap    = await get(ref(db, `devices/${deviceId}/config/tankCapacityLitres`));
          const tank        = tankSnap.val() ?? 2000;
          const newTotal    = (summary.totalLitres ?? 0) + litres;

          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/date`]               = dateKey;
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/totalLitres`]        = newTotal;
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/tankCapacityLitres`] = tank;
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/ratioPercent`]       = Math.min(100, Math.round((newTotal/tank)*100));
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/byValve/${valveId}`] = (summary.byValve?.[valveId] ?? 0) + litres;
        }
      }

      await update(ref(db), updates);
    } catch (e: unknown) {
      setError("Failed to toggle valve: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setTimeout(() => setToggling(t => ({ ...t, [valveId]: false })), 600);
    }
  }, [deviceId, valves]);

  const handleAllOn  = () => Object.keys(valves).forEach(id => !valves[id].desiredState && handleToggle(id, true));
  const handleAllOff = () => Object.keys(valves).forEach(id =>  valves[id].desiredState && handleToggle(id, false));

  const formatTime = (ts: number | null) => {
    if (!ts) return tl("now", language);
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1)  return tl("now", language);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m/60)}h`;
  };

  if (!deviceId) {
    return (
      <div className="bg-[#F4F8F4] min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-700 text-center mb-2">{tl("noDevice", language)}</h2>
        <p className="text-gray-500 text-center text-sm">Please complete setup to link your hardware.</p>
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
          <div className="flex items-center gap-2">
            {connected
              ? <Wifi className="w-5 h-5 text-green-300" />
              : <WifiOff className="w-5 h-5 text-red-300" />
            }
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Valves */}
      <div className="px-4 py-6 space-y-4">
        {Object.keys(valves).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-spin" />
            <p className="text-gray-400">Loading valves...</p>
          </div>
        ) : Object.entries(valves).map(([valveId, valve]) => {
          const isOpen     = valve.desiredState;
          const isSynced   = valve.hardwareState === valve.desiredState;
          const isToggling = toggling[valveId];

          return (
            <div key={valveId}
              className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${isOpen ? 'border-2 border-[#2E7D32]' : 'border border-gray-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${isOpen ? 'bg-[#E8F5E9]' : 'bg-[#EEEEEE]'}`}>
                    <Droplet className={`w-6 h-6 ${isOpen ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#263238] text-base">
                      {tl("valve", language)} {valveId.replace("valve", "")}
                    </h3>
                    <p className="text-sm text-[#90A4AE]">{valve.label}</p>
                  </div>
                </div>
                <Switch
                  checked={isOpen}
                  disabled={isToggling}
                  onCheckedChange={(checked) => handleToggle(valveId, checked)}
                />
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E8EFE8]">
                <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-[#2E7D32]' : 'bg-[#90A4AE]'}`} />
                <span className={`text-sm font-medium ${isOpen ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`}>
                  {isOpen ? tl("open", language) : tl("closed", language)}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {isToggling ? "..." : (valve.hardwareState !== null
                    ? (isSynced ? tl("confirmed", language) : tl("pending", language))
                    : tl("pending", language))}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-[#90A4AE]">
                <Clock className="w-4 h-4" />
                <span>{tl("lastActive", language)}: {formatTime(valve.lastConfirmed)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-24 pt-2 space-y-2">
        <button onClick={handleAllOn}
          className="w-full bg-[#2E7D32] text-white rounded-2xl py-3 font-semibold">
          {tl("turnAllOn", language)}
        </button>
        <button onClick={handleAllOff}
          className="w-full bg-white border-2 border-[#2E7D32] text-[#2E7D32] rounded-2xl py-3 font-semibold">
          {tl("turnAllOff", language)}
        </button>
      </div>
    </div>
  );
}