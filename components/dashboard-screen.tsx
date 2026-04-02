'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Droplet, Thermometer, Wind, Zap, Wifi, WifiOff, Battery, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/context/LanguageContext';
import { t } from '@/lib/i18n';
import { LanguageSelector } from './language-selector';
import { getClientDb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { useAndroidBridge } from '@/hooks/useAndroidBridge';

interface WaterData {
  totalLitres: number;
  tankCapacityLitres: number;
  ratioPercent: number;
}

export function DashboardScreen() {
  const { language }  = useLanguage();
  const bridge        = useAndroidBridge();

  const deviceId = typeof window !== 'undefined'
    ? (localStorage.getItem('sf_device_id') || bridge.getAndroidDeviceId())
    : null;
  const uid = typeof window !== 'undefined'
    ? localStorage.getItem('sf_uid')
    : null;

  const [sensors,    setSensors]    = useState<Record<string, number | null>>({});
  const [water,      setWater]      = useState<WaterData>({ totalLitres: 0, tankCapacityLitres: 2000, ratioPercent: 0 });
  const [powerCut,   setPowerCut]   = useState(false);
  const [isStale,    setIsStale]    = useState(false);
  const [userName,   setUserName]   = useState('Farmer');
  const [location,   setLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [locPending, setLocPending] = useState(false);
  const [connected,  setConnected]  = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const db    = getClientDb();
    const today = new Date().toISOString().slice(0, 10);
    const refs: ReturnType<typeof ref>[] = [];

    const sensorRef = ref(db, `devices/${deviceId}/sensors`);
    refs.push(sensorRef);
    onValue(sensorRef, snap => {
      const d = snap.val();
      if (!d) return;
      setSensors(d);
      setConnected(true);
      setIsStale(d.timestamp ? Date.now() - d.timestamp > 3 * 60 * 1000 : true);
      setPowerCut((d.battery ?? 100) < 20);
    });

    const waterRef = ref(db, `devices/${deviceId}/waterUsage/daily/${today}`);
    refs.push(waterRef);
    onValue(waterRef, snap => {
      const d = snap.val();
      if (d) setWater({ totalLitres: d.totalLitres ?? 0, tankCapacityLitres: d.tankCapacityLitres ?? 2000, ratioPercent: d.ratioPercent ?? 0 });
    });

    const locRef = ref(db, `devices/${deviceId}/location`);
    refs.push(locRef);
    onValue(locRef, snap => {
      const d = snap.val();
      if (d?.lat && d?.lng) { setLocation({ lat: d.lat, lng: d.lng }); setLocPending(!!d.pending); }
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

  // ── Location: use native Android GPS if available, else SMS ──────────────
  const handleGetLocation = async () => {
    setLocPending(true);
    try {
      if (bridge.isAndroid) {
        // Use native GPS directly — faster and more accurate
        const loc = await bridge.requestNativeLocation();
        setLocation(loc);
        // Also save to Firebase
        const db = getClientDb();
        if (deviceId) {
          const { set, ref: dbRef } = await import('firebase/database');
          await set(dbRef(db, `devices/${deviceId}/location`), {
            lat: loc.lat, lng: loc.lng,
            source: 'gps-android', timestamp: Date.now(), pending: false,
          });
        }
      } else {
        // Web: send SMS to hardware via API
        await fetch('/api/location/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
      }
    } catch {
      setLocPending(false);
    } finally {
      setLocPending(false);
    }
  };

  const getStatus = (value: number | null | undefined, low: number, high: number) => {
    if (value == null) return { label: '---', color: 'bg-gray-100 text-gray-400' };
    if (value < low)  return { label: t('low',    language), color: 'bg-blue-100 text-blue-700' };
    if (value > high) return { label: t('high',   language), color: 'bg-red-100 text-red-700' };
    return              { label: t('normal', language), color: 'bg-green-100 text-green-700' };
  };

  const temp    = sensors.temperature as number | null ?? null;
  const hum     = sensors.humidity    as number | null ?? null;
  const battPct = sensors.battery     as number ?? 0;
  const battV   = sensors.batteryVoltage as number ?? 0;
  const battColor = battPct > 50 ? 'text-green-300' : battPct > 20 ? 'text-orange-400' : 'text-red-400';

  if (!deviceId) {
    return (
      <div className="bg-[#F4F8F4] min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-700 text-center mb-2">No Device Linked</h2>
        <p className="text-gray-500 text-center text-sm">Complete setup to connect your Smart Farm hardware.</p>
      </div>
    );
  }

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
            {connected
              ? <Wifi className="w-5 h-5 text-green-300" />
              : <WifiOff className="w-5 h-5 text-red-300" />
            }
            <LanguageSelector />
          </div>
        </div>

        {/* Stale warning */}
        {isStale && connected && (
          <div className="mt-2 bg-yellow-500/30 rounded-xl px-3 py-1.5 text-xs text-yellow-100">
            ⚠️ Data over 3 min old — check hardware
          </div>
        )}

        {/* Battery bar */}
        {sensors.battery != null && (
          <div className="mt-3 flex items-center gap-2">
            <Battery className={`w-4 h-4 ${battColor}`} />
            <div className="flex-1 bg-green-900 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${battPct > 50 ? 'bg-green-300' : battPct > 20 ? 'bg-orange-400' : 'bg-red-400'}`}
                style={{ width: `${battPct}%` }} />
            </div>
            <span className="text-xs text-green-200">{battPct}% ({battV}V)</span>
          </div>
        )}
      </div>

      {/* Power cut alert */}
      {powerCut && (
        <div className="mx-4 mt-4 bg-[#E53935] rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
          <div className="text-white">
            <p className="font-semibold">{t('power_cut_alert', language)}</p>
            <p className="text-sm text-white/90">{t('currently_experiencing_power_cut', language)}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-6">
        <h2 className="text-lg font-bold text-[#263238] mb-4">{t('real_time_sensors', language)}</h2>

        {/* Temperature */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFF3E0] rounded-xl p-3"><Thermometer className="w-6 h-6 text-[#F57C00]" /></div>
              <p className="text-sm text-[#90A4AE]">{t('temperature', language)}</p>
            </div>
            <Badge className={getStatus(temp, 20, 35).color}>{getStatus(temp, 20, 35).label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{temp != null ? `${temp}°C` : '---'}</p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('ambient_temperature', language)}</p>
        </div>

        {/* Humidity */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E1F5FE] rounded-xl p-3"><Wind className="w-6 h-6 text-[#0277BD]" /></div>
              <p className="text-sm text-[#90A4AE]">{t('humidity', language)}</p>
            </div>
            <Badge className={getStatus(hum, 30, 85).color}>{getStatus(hum, 30, 85).label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{hum != null ? `${hum}%` : '---'}</p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('relative_humidity', language)}</p>
        </div>

        {/* Soil Moisture */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E8F5E9] rounded-xl p-3"><Droplet className="w-6 h-6 text-[#2E7D32]" /></div>
              <p className="text-sm text-[#90A4AE]">{t('soil_moisture', language)}</p>
            </div>
            <Badge className="bg-green-100 text-green-700">{t('normal', language)}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">65%</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div className="bg-[#2E7D32] h-2 rounded-full" style={{ width: '65%' }} />
          </div>
        </div>

        {/* Water Usage */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E3F2FD] rounded-xl p-3"><Zap className="w-6 h-6 text-[#1565C0]" /></div>
              <p className="text-sm text-[#90A4AE]">{t('water_flow', language)}</p>
            </div>
            <Badge className="bg-green-100 text-green-700">{t('active', language)}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{water.totalLitres}L</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div className="bg-[#1565C0] h-2 rounded-full" style={{ width: `${Math.min(water.ratioPercent, 100)}%` }} />
          </div>
          <p className="text-xs text-[#90A4AE] mt-2">{water.totalLitres}L / {water.tankCapacityLitres}L ({water.ratioPercent}%)</p>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#F3E5F5] rounded-xl p-3"><MapPin className="w-6 h-6 text-[#7B1FA2]" /></div>
              <div>
                <p className="text-sm font-medium text-[#263238]">Device Location</p>
                <p className="text-xs text-[#90A4AE]">{bridge.isAndroid ? 'Native GPS' : 'Via GSM SMS'}</p>
              </div>
            </div>
            <button
              onClick={handleGetLocation}
              disabled={locPending}
              className="bg-[#7B1FA2] text-white text-xs rounded-xl px-3 py-2 disabled:bg-gray-300 transition-colors"
            >
              {locPending ? 'Locating...' : 'Get Location'}
            </button>
          </div>
          {location ? (
            <button
              onClick={() => bridge.openMaps(location.lat, location.lng)}
              className="text-sm text-[#7B1FA2] underline text-left"
            >
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)} — Open Maps
            </button>
          ) : (
            <p className="text-xs text-[#90A4AE]">
              {locPending ? 'Fetching location...' : 'Tap Get Location'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}