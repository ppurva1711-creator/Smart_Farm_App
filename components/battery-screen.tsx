'use client';

import { Battery, CheckCircle } from 'lucide-react';

export function BatteryScreen({
  batteryPercentage = 75,
  cyclesUsedToday = 2,
  maxDailyCycles = 4,
}: {
  batteryPercentage?: number;
  cyclesUsedToday?: number;
  maxDailyCycles?: number;
}) {
  const batteryStatus = () => {
    if (batteryPercentage > 50) return { label: 'Good', color: '#2E7D32' };
    if (batteryPercentage > 25) return { label: 'Fair', color: '#F57C00' };
    return { label: 'Low', color: '#E53935' };
  };

  const status = batteryStatus();

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <h1 className="text-2xl font-bold">Battery Status</h1>
        <p className="text-white text-opacity-80 text-sm mt-1">System power information</p>
      </div>

      {/* Main Battery Display */}
      <div className="px-4 py-8">
        <div className="bg-white rounded-3xl p-8 shadow-sm text-center mb-6">
          {/* Circular Battery Indicator */}
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute w-full h-full" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="95"
                  fill="none"
                  stroke="#E8EFE8"
                  strokeWidth="8"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="95"
                  fill="none"
                  stroke={status.color}
                  strokeWidth="8"
                  strokeDasharray={`${(batteryPercentage / 100) * 597} 597`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }}
                />
              </svg>

              {/* Center Content */}
              <div className="text-center z-10">
                <Battery className="w-12 h-12 mx-auto mb-2" style={{ color: status.color }} />
                <p className="text-4xl font-bold text-[#263238]">{batteryPercentage}%</p>
                <p className="text-sm text-[#90A4AE] mt-2">{status.label}</p>
              </div>
            </div>
          </div>

          {/* Last Charged */}
          <div className="bg-[#F4F8F4] rounded-2xl p-4">
            <p className="text-sm text-[#90A4AE]">Last Charged</p>
            <p className="font-semibold text-[#263238]">Today at 06:30 AM</p>
          </div>
        </div>

        {/* Daily Cycles */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="font-bold text-[#263238] mb-4 text-lg">Daily Cycles Used</h3>

          {/* Cycle Progress */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#263238]">
                  Cycles: {cyclesUsedToday}/{maxDailyCycles}
                </span>
                <span className="text-sm text-[#90A4AE]">
                  {Math.round((cyclesUsedToday / maxDailyCycles) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#E8EFE8] rounded-full h-3">
                <div
                  className="bg-[#2E7D32] h-3 rounded-full transition-all"
                  style={{ width: `${(cyclesUsedToday / maxDailyCycles) * 100}%` }}
                />
              </div>
            </div>

            {/* Cycle Indicators */}
            <div className="flex gap-2 mt-6">
              {Array.from({ length: maxDailyCycles }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-16 rounded-xl flex items-center justify-center font-bold text-white transition-all ${
                    index < cyclesUsedToday ? 'bg-[#2E7D32]' : 'bg-[#E8EFE8]'
                  }`}
                >
                  <span className={index < cyclesUsedToday ? 'text-white' : 'text-[#90A4AE]'}>
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Remaining Info */}
          <div className="mt-4 p-3 bg-[#F4F8F4] rounded-xl">
            <p className="text-sm text-[#263238]">
              <span className="font-medium">{maxDailyCycles - cyclesUsedToday}</span> cycles remaining today
            </p>
          </div>
        </div>

        {/* Recharge Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-[#E8F5E9] rounded-full p-2 mt-1">
              <CheckCircle className="w-6 h-6 text-[#2E7D32]" />
            </div>
            <div>
              <h3 className="font-bold text-[#263238]">Ready to Recharge</h3>
              <p className="text-sm text-[#90A4AE] mt-1">
                System is ready for charging. Next recommended charge time: 08:00 PM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
