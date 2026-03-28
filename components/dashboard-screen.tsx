'use client';

import { AlertTriangle, Droplet, Thermometer, Wind, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/context/LanguageContext';
import { t } from '@/lib/i18n';
import { LanguageSelector } from './language-selector';

interface SensorData {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  waterFlow: number;
}

export function DashboardScreen({
  userName = 'Farmer',
  sensorData = {
    soilMoisture: 65,
    temperature: 28,
    humidity: 72,
    waterFlow: 12.5,
  },
  powerCutActive = false,
}: {
  userName?: string;
  sensorData?: SensorData;
  powerCutActive?: boolean;
}) {
  const { language } = useLanguage();

  const getSoilMoistureStatus = (value: number) => {
    if (value < 40) return { label: t('dry', language), color: 'bg-red-100 text-red-700' };
    if (value > 80) return { label: t('high', language), color: 'bg-blue-100 text-blue-700' };
    return { label: t('normal', language), color: 'bg-green-100 text-green-700' };
  };

  const getTemperatureStatus = (value: number) => {
    if (value < 20) return { label: t('low', language), color: 'bg-blue-100 text-blue-700' };
    if (value > 35) return { label: t('high', language), color: 'bg-red-100 text-red-700' };
    return { label: t('normal', language), color: 'bg-green-100 text-green-700' };
  };

  const getHumidityStatus = (value: number) => {
    if (value < 30) return { label: t('low', language), color: 'bg-orange-100 text-orange-700' };
    if (value > 85) return { label: t('high', language), color: 'bg-blue-100 text-blue-700' };
    return { label: t('normal', language), color: 'bg-green-100 text-green-700' };
  };

  const soilStatus = getSoilMoistureStatus(sensorData.soilMoisture);
  const tempStatus = getTemperatureStatus(sensorData.temperature);
  const humidityStatus = getHumidityStatus(sensorData.humidity);

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* AppBar */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t('welcome', language)}, {userName}</h1>
            <p className="text-white text-opacity-80 text-sm mt-1">{t('smart_farm_control', language)}</p>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Power Cut Alert */}
      {powerCutActive && (
        <div className="mx-4 mt-4 bg-[#E53935] rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
          <div className="text-white">
            <p className="font-semibold">{t('power_cut_alert', language)}</p>
            <p className="text-sm text-white text-opacity-90">{t('currently_experiencing_power_cut', language)}</p>
          </div>
        </div>
      )}

      {/* Sensors Section */}
      <div className="px-4 py-6">
        <h2 className="text-lg font-bold text-[#263238] mb-4">{t('real_time_sensors', language)}</h2>

        {/* Soil Moisture Card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E8F5E9] rounded-xl p-3">
                <Droplet className="w-6 h-6 text-[#2E7D32]" />
              </div>
              <div>
                <p className="text-sm text-[#90A4AE]">{t('soil_moisture', language)}</p>
              </div>
            </div>
            <Badge className={soilStatus.color}>{soilStatus.label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{sensorData.soilMoisture}%</p>
          <div className="w-full bg-[#E8EFE8] rounded-full h-2 mt-3">
            <div
              className="bg-[#2E7D32] h-2 rounded-full transition-all"
              style={{ width: `${sensorData.soilMoisture}%` }}
            />
          </div>
        </div>

        {/* Temperature Card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFF3E0] rounded-xl p-3">
                <Thermometer className="w-6 h-6 text-[#F57C00]" />
              </div>
              <div>
                <p className="text-sm text-[#90A4AE]">{t('temperature', language)}</p>
              </div>
            </div>
            <Badge className={tempStatus.color}>{tempStatus.label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{sensorData.temperature}°C</p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('ambient_temperature', language)}</p>
        </div>

        {/* Humidity Card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E1F5FE] rounded-xl p-3">
                <Wind className="w-6 h-6 text-[#0277BD]" />
              </div>
              <div>
                <p className="text-sm text-[#90A4AE]">{t('humidity', language)}</p>
              </div>
            </div>
            <Badge className={humidityStatus.color}>{humidityStatus.label}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{sensorData.humidity}%</p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('relative_humidity', language)}</p>
        </div>

        {/* Water Flow Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#E3F2FD] rounded-xl p-3">
                <Zap className="w-6 h-6 text-[#1565C0]" />
              </div>
              <div>
                <p className="text-sm text-[#90A4AE]">{t('water_flow', language)}</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">{t('active', language)}</Badge>
          </div>
          <p className="text-3xl font-bold text-[#263238]">{sensorData.waterFlow} L/min</p>
          <p className="text-xs text-[#90A4AE] mt-2">{t('current_flow_rate', language)}</p>
        </div>
      </div>
    </div>
  );
}
