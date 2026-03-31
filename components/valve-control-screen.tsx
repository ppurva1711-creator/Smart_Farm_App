'use client';

import { useState, useEffect } from 'react';
import { Droplet, Clock, Wifi, WifiOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/app/context/LanguageContext';
import type { Language } from '@/app/context/LanguageContext';
import { getClientDb } from '@/lib/firebase';
import { ref, onValue, off, update } from 'firebase/database';

const T: Record<string, Record<Language, string>> = {
  title:      { en: "Valve Control",        hi: "वाल्व नियंत्रण",     mr: "झडप नियंत्रण",      pa: "ਵਾਲਵ ਕੰਟਰੋਲ",       te: "వాల్వ్ నియంత్రణ",    ta: "வால்வு கட்டுப்பாடு" },
  subtitle:   { en: "Manage irrigation",    hi: "सिंचाई प्रबंधन",     mr: "सिंचन व्यवस्थापन",  pa: "ਸਿੰਚਾਈ ਪ੍ਰਬੰਧਨ",    te: "నీటిపారుదల",          ta: "நீர்ப்பாசனம்" },
  valve:      { en: "Valve",                hi: "वाल्व",               mr: "झडप",                pa: "ਵਾਲਵ",               te: "వాల్వ్",              ta: "வால்வு" },
  on:         { en: "OPEN",                 hi: "खुला",                mr: "उघडे",               pa: "ਖੁੱਲ੍ਹਾ",            te: "తెరిచి",              ta: "திறந்த" },
  off:        { en: "CLOSED",               hi: "बंद",                 mr: "बंद",                pa: "ਬੰਦ",                te: "మూసివున్న",            ta: "மூடிய" },
  lastActive: { en: "Last active",          hi: "अंतिम सक्रिय",        mr: "शेवटचे सक्रिय",     pa: "ਆਖਰੀ ਸਕਿਰਿਆ",        te: "చివరగా యాక్టివ్",    ta: "கடைசியாக" },
  turnAllOn:  { en: "Turn All On",          hi: "सभी खोलें",           mr: "सर्व उघडा",          pa: "ਸਾਰੇ ਖੋਲ੍ਹੋ",        te: "అన్నీ తెరవు",         ta: "அனைத்தும் திற" },
  turnAllOff: { en: "Turn All Off",         hi: "सभी बंद करें",        mr: "सर्व बंद करा",       pa: "ਸਾਰੇ ਬੰਦ ਕਰੋ",       te: "అన్నీ మూయి",          ta: "அனைத்தும் மூடு" },
  syncing:    { en: "Syncing with hardware",hi: "हार्डवेयर से जुड़ रहा", mr: "हार्डवेअर सिंक",    pa: "ਹਾਰਡਵੇਅਰ ਸਿੰਕ",     te: "హార్డ్‌వేర్ సమకాలీన", ta: "வன்பொருள் ஒத்திசைவு" },
  noDevice:   { en: "No device linked",     hi: "कोई डिवाइस नहीं",    mr: "डिव्हाइस नाही",      pa: "ਕੋਈ ਡਿਵਾਈਸ ਨਹੀਂ",   te: "పరికరం లింక్ లేదు",  ta: "சாதனம் இணைக்கப்படவில்லை" },
  now:        { en: "just now",             hi: "अभी",                 mr: "आत्ता",              pa: "ਹੁਣੇ",               te: "ఇప్పుడే",             ta: "இப்போதே" },
  confirmed:  { en: "✓ Hardware confirmed", hi: "✓ हार्डवेयर पुष्टि",  mr: "✓ हार्डवेअर पुष्टी",pa: "✓ ਹਾਰਡਵੇਅਰ ਪੁਸ਼ਟੀ",  te: "✓ హార్డ్‌వేర్ నిర్ధారణ",ta: "✓ வன்பொருள் உறுதி" },
  pending:    { en: "⏳ Waiting for hardware",hi: "⏳ हार्डवेयर प्रतीक्षा",mr: "⏳ हार्डवेअर प्रतीक्षा",pa: "⏳ ਹਾਰਡਵੇਅਰ ਉਡੀਕ",te: "⏳ హార్డ్‌వేర్ వేచి",  ta: "⏳ வன்பொருள் காத்திருக்கிறது" },
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
}

export function ValveControlScreen() {
  const { language } = useLanguage();
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('sf_device_id') : null;

  const [valves,     setValves]     = useState<Record<string, ValveData>>({});
  const [connected,  setConnected]  = useState(false);
  const [toggling,   setToggling]   = useState<Record<string, boolean>>({});

  // ── Subscribe to real-time valve states from Firebase ─────────────────
  useEffect(() => {
    if (!deviceId) return;
    const db = getClientDb();
    const r  = ref(db, `devices/${deviceId}/valves`);

    onValue(r, snap => {
      const data = snap.val();
      if (!data) {
        // No valves yet — create default 4 valves in Firebase
        const defaults: Record<string, ValveData> = {};
        ['valve1','valve2','valve3','valve4'].forEach((id, i) => {
          defaults[id] = {
            desiredState:  false,
            hardwareState: null,
            lastConfirmed: null,
            openedAt:      null,
            label:         `Field ${['North','South','East','West'][i]}`,
          };
        });
        update(ref(db, `devices/${deviceId}/valves`), defaults);
        setValves(defaults);
      } else {
        setValves(data);
      }
      setConnected(true);
    });

    return () => off(r);
  }, [deviceId]);

  // ── Toggle valve — writes to Firebase, hardware picks it up in 5s ──────
  const handleToggle = async (valveId: string, newState: boolean) => {
    if (!deviceId) return;
    setToggling(t => ({ ...t, [valveId]: true }));

    try {
      const db  = getClientDb();
      const now = Date.now();
      const updates: Record<string, unknown> = {
        [`devices/${deviceId}/valves/${valveId}/desiredState`]: newState,
        [`devices/${deviceId}/valves/${valveId}/desiredAt`]:    now,
      };

      // Track water usage
      if (newState) {
        updates[`devices/${deviceId}/valves/${valveId}/openedAt`]  = now;
        updates[`devices/${deviceId}/valves/${valveId}/closedAt`]  = null;
      } else {
        const openedAt = valves[valveId]?.openedAt;
        if (openedAt) {
          const durationMins = (now - openedAt) / 60000;
          const flowRate     = 10; // litres/min default
          const litres       = Math.round(durationMins * flowRate);
          const dateKey      = new Date(now).toISOString().slice(0, 10);
          updates[`devices/${deviceId}/valves/${valveId}/closedAt`]  = now;
          updates[`devices/${deviceId}/valves/${valveId}/openedAt`]  = null;
          // Add to daily water total
          const prevTotal = Object.values(valves).reduce((sum, v) => sum, 0);
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/totalLitres`] = prevTotal + litres;
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/byValve/${valveId}`] = litres;
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/date`]              = dateKey;
          updates[`devices/${deviceId}/waterUsage/daily/${dateKey}/tankCapacityLitres`]= 2000;
        }
      }

      await update(ref(getClientDb()), updates);
    } finally {
      setTimeout(() => setToggling(t => ({ ...t, [valveId]: false })), 500);
    }
  };

  const handleAllOn  = () => Object.keys(valves).forEach(id => handleToggle(id, true));
  const handleAllOff = () => Object.keys(valves).forEach(id => handleToggle(id, false));

  const formatTime = (ts: number | null) => {
    if (!ts) return tl('now', language);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1)  return tl('now', language);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h`;
  };

  if (!deviceId) {
    return (
      <div className="bg-[#F4F8F4] min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-700 text-center">{tl('noDevice', language)}</h2>
      </div>
    );
  }

  const valveEntries = Object.entries(valves);

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tl('title', language)}</h1>
            <p className="text-white text-opacity-80 text-sm mt-1">{tl('subtitle', language)}</p>
          </div>
          {connected
            ? <Wifi className="w-5 h-5 text-green-300" />
            : <WifiOff className="w-5 h-5 text-red-300" />
          }
        </div>
      </div>

      {/* Valves */}
      <div className="px-4 py-6 space-y-4">
        {valveEntries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            <p>Loading valves...</p>
          </div>
        ) : valveEntries.map(([valveId, valve]) => {
          const isSynced   = valve.hardwareState === valve.desiredState;
          const isOpen     = valve.desiredState;
          const isToggling = toggling[valveId];

          return (
            <div
              key={valveId}
              className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${
                isOpen ? 'border-2 border-[#2E7D32]' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${isOpen ? 'bg-[#E8F5E9]' : 'bg-[#EEEEEE]'}`}>
                    <Droplet className={`w-6 h-6 ${isOpen ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#263238] text-base">
                      {tl('valve', language)} {valveId.replace('valve', '')}
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

              {/* Status */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E8EFE8]">
                <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-[#2E7D32]' : 'bg-[#90A4AE]'}`} />
                <span className={`text-sm font-medium ${isOpen ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`}>
                  {isOpen ? tl('on', language) : tl('off', language)}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {valve.hardwareState !== null
                    ? (isSynced ? tl('confirmed', language) : tl('pending', language))
                    : tl('pending', language)
                  }
                </span>
              </div>

              {/* Last active */}
              <div className="flex items-center gap-2 mt-2 text-xs text-[#90A4AE]">
                <Clock className="w-4 h-4" />
                <span>{tl('lastActive', language)}: {formatTime(valve.lastConfirmed)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-24 pt-2">
        <button onClick={handleAllOn}  className="w-full bg-white border-2 border-[#2E7D32] text-[#2E7D32] rounded-2xl py-3 font-semibold mb-2">
          {tl('turnAllOn', language)}
        </button>
        <button onClick={handleAllOff} className="w-full bg-[#E8F5E9] text-[#2E7D32] rounded-2xl py-3 font-semibold">
          {tl('turnAllOff', language)}
        </button>
      </div>
    </div>
  );
}
