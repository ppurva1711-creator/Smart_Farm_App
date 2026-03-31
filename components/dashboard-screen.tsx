'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Droplet, Thermometer, Wind, Zap, Wifi, WifiOff, Battery, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/context/LanguageContext';
import { t } from '@/lib/i18n';
import { LanguageSelector } from './language-selector';
import { getClientDb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

interface SensorData {
  temperature:   number | null;
  humidity:      number | null;
  battery:       number | null;
  batteryVoltage:number | null;
  timestamp:     number | null;
}

interface WaterData {
  totalLitres:        number;
  tankCapacityLitres: number;
  ratioPercent:       number;
}

export function DashboardScreen() {
  const { language } = useLanguage();

  // ── Read device ID saved during login/setup ─────────────────────────────
  const deviceId  = typeof window !== 'undefined' ? localStorage.getItem('sf_device_id')  : null;
  const uid       = typeof window !== 'undefined' ? localStorage.getItem('sf_uid')         : null;

  // ── Live state from Firebase ────────────────────────────────────────────
  const [sensors,     setSensors]     = useState<SensorData>({ temperature: null, humidity: null, battery: null, batteryVoltage: null, timestamp: null });
  const [water,       setWater]       = useState<WaterData>({ totalLitres: 0, tankCapacityLitres: 2000, ratioPercent: 0 });
  const [powerCut,    setPowerCut]    = useState(false);
  const [isStale,     setIsStale]     = useState(false);
  const [userName,    setUserName]    = useState('Farmer');
  const [location,    setLocation]    = useState<{ lat: number; lng: number } | null>(null);
  const [locPending,  setLocPending]  = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const db      = getClientDb();
    const today   = new Date().toISOString().slice(0, 10);
    const refs: ReturnType<typeof ref>[] = [];

    // ── Live sensor data ──────────────────────────────────────────────────
    const sensorRef = ref(db, `devices/${deviceId}/sensors`);
    refs.push(sensorRef);
    onValue(sensorRef, snap => {
      const d = snap.val();
      if (!d) return;
      setSensors({
        temperature:    d.temperature    ?? null,
        humidity:       d.humidity       ?? null,
        battery:        d.battery        ?? null,
        batteryVoltage: d.batteryVoltage ?? null,
        timestamp:      d.timestamp      ?? null,
      });
      setIsConnected(true);
      // Mark stale if last update > 3 minutes ago
      setIsStale(d.timestamp ? Date.now() - d.timestamp > 3 * 60 * 1000 : true);
    });

    // ── Water usage today ─────────────────────────────────────────────────
    const waterRef = ref(db, `devices/${deviceId}/waterUsage/daily/${today}`);
    refs.push(waterRef);
    onValue(waterRef, snap => {
      const d = snap.val();
      if (d) setWater({
        totalLitres:        d.totalLitres        ?? 0,
        tankCapacityLitres: d.tankCapacityLitres ?? 2000,
        ratioPercent:       d.ratioPercent       ?? 0,
      });
    });

    // ── Location ──────────────────────────────────────────────────────────
    const locRef = ref(db, `devices/${deviceId}/location`);
    refs.push(locRef);
    onValue(locRef, snap => {
      const d = snap.val();
      if (d?.lat && d?.lng) {
        setLocation({ lat: d.lat, lng: d.lng });
        setLocPending(!!d.pending);
      }
    });

    // ── Power cut alert (battery < 20%) ───────────────────────────────────
    const battRef = ref(db, `devices/${deviceId}/sensors/battery`);
    refs.push(battRef);
    onValue(battRef, snap => {
      const pct = snap.val();
      if (pct !== null) setPowerCut(pct < 20);
    });

    return () => refs.forEach(r => off(r));
  }, [deviceId]);

  // ── Load user name from Firebase ─────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const db = getClientDb();
    const r  = ref(db, `users/${uid}/profile/fullName`);
    onValue(r, snap => {
      if (snap.val()) setUserName(snap.val());
    });
    return () => off(r);
  }, [uid]);

  // ── Request location via SMS to hardware ─────────────────────────────────
  const requestLocation = async () => {
    if (!deviceId) return;
    setLocPending(true);
    try {
      await fetch('/api/location/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
    } catch {
      setLocPending(false);
    }
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const getStatus = (value: number | null, low: number, high: number) => {
    if (value === null) return { label: '---', color: 'bg-gray-100 text-gray-400' };
    if (value < low)   return { label: t('low',    language), color: 'bg-blue-100 text-blue-700' };
    if (value > high)  return { label: t('high',   language), color: 'bg-red-100 text-red-700' };
    return               { label: t('normal', language), color: 'bg-green-100 text-green-700' };
  };

  const soilStatus  = getStatus(65,               40, 80);  // soil moisture (mock until hardware)
  const tempStatus  = getStatus(sensors.temperature, 20, 35);
  const humStatus   = getStatus(sensors.humidity,    30, 85);

  const battPct  = sensors.battery ?? 0;
  const battColor = battPct > 50 ? 'text-green-600' : battPct > 20 ? 'text-orange-500' : 'text-red-600';

  // ── Show message if no device linked ────────────────────────────────────
  if (!deviceId) {
    return (
      <div className="bg-[#F4F8F4] min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-700 text-center mb-2">No Device Linked</h2>
        <p className="text-gray-500 text-center text-sm">
          Go to Settings to connect your Smart Farm hardware.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">

      {/* ── AppBar ── */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t('welcome', language)}, {userName}</h1>
            <p className="text-white text-opacity-80 text-sm mt-1">{t('smart_farm_control', language)}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            {isConnected
              ? <Wifi className="w-5 h-5 text-green-300" />
              : <WifiOff className="w-5 h-5 text-red-300" />
            }
            <LanguageSelector />
          </div>
        </div>

        {/* Stale data warning */}
        {isStale && isConnected && (
          <div className="mt-2 bg-yellow-500 bg-opacity-30 rounded-xl px-3 py-1.5 text-xs text-yellow-100">
            ⚠️ Last update over 3 minutes ago — check hardware connection
          </div>
        )}

        {/* Battery bar */}
        {sensors.battery !== null && (
          <div className="mt-3 flex items-center gap-2">
            <Battery className={`w-4 h-4 ${battColor}`} />
            <div className="flex-1 bg-green-900 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${battPct > 50 ? 'bg-green-300' : battPct > 20 ? 'bg-orange-400' : 'bg-red-400'}`}
                style={{ width: `${battPct}%` }}
              />
            </div>
            <span className="text-xs text-green-200">{battPct}% ({sensors.batteryVoltage ?? '?'}V)</span>
          </div>
        )}
      </div>

      {/* ── Power Cut Alert ── */}
      {powerCut && (
        <div className="mx-4 mt-4 bg-[#E53935] rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
          <div className="text-white">
            <p className="font-semibold">{t('power_cut_alert', language)}</p>
            <p className="text-sm text-white text-opacity-90">{t('currently_experiencing_power_cut', language)}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-6">
        <h2 className="text-lg font-bold text-[#263238] mb-4">{t('real_time_sensors', language)}</h2>

        {/* ── Temperature ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFF3E0] rounded-xl p-3">
                <Thermometer className="w-6 h-6 text-[#F57C00]" />
              </div>
              <p className="text-sm text-[#90A4AE]">{t('temperature', language)}</p>
            </div>
            <Badge className={tempStatus.color}>{tempStatus.label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">
            {sensors.temperature !== null ? `${sensors.temperature}°C` : '---'}
          </p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('ambient_temperature', language)}</p>
        </div>

        {/* ── Humidity ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E1F5FE] rounded-xl p-3">
                <Wind className="w-6 h-6 text-[#0277BD]" />
              </div>
              <p className="text-sm text-[#90A4AE]">{t('humidity', language)}</p>
            </div>
            <Badge className={humStatus.color}>{humStatus.label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">
            {sensors.humidity !== null ? `${sensors.humidity}%` : '---'}
          </p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('relative_humidity', language)}</p>
        </div>

        {/* ── Soil Moisture (still mock until soil sensor added) ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E8F5E9] rounded-xl p-3">
                <Droplet className="w-6 h-6 text-[#2E7D32]" />
              </div>
              <p className="text-sm text-[#90A4AE]">{t('soil_moisture', language)}</p>
            </div>
            <Badge className={soilStatus.color}>{soilStatus.label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">65%</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div className="bg-[#2E7D32] h-2 rounded-full" style={{ width: '65%' }} />
          </div>
        </div>

        {/* ── Water Usage Today ── */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E3F2FD] rounded-xl p-3">
                <Zap className="w-6 h-6 text-[#1565C0]" />
              </div>
              <p className="text-sm text-[#90A4AE]">{t('water_flow', language)}</p>
            </div>
            <Badge className="bg-green-100 text-green-700">{t('active', language)}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{water.totalLitres}L</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div
              className="bg-[#1565C0] h-2 rounded-full transition-all"
              style={{ width: `${Math.min(water.ratioPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#90A4AE] mt-2">
            {water.totalLitres}L / {water.tankCapacityLitres}L ({water.ratioPercent}% of tank)
          </p>
        </div>

        {/* ── Location ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#F3E5F5] rounded-xl p-3">
                <MapPin className="w-6 h-6 text-[#7B1FA2]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#263238]">Device Location</p>
                <p className="text-xs text-[#90A4AE]">Via GSM / SMS</p>
              </div>
            </div>
            <button
              onClick={requestLocation}
              disabled={locPending}
              className="bg-[#7B1FA2] text-white text-xs rounded-xl px-3 py-2 disabled:bg-gray-300 transition-colors"
            >
              {locPending ? 'Locating...' : 'Get Location'}
            </button>
          </div>
          {location ? (
            <a
              href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#7B1FA2] underline"
            >
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)} — View on Maps
            </a>
          ) : (
            <p className="text-xs text-[#90A4AE]">
              {locPending ? 'Waiting for hardware to reply...' : 'Tap "Get Location" to fetch device GPS'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
