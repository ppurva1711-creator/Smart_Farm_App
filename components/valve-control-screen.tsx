'use client';

import { useState } from 'react';
import { Droplet, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Valve {
  id: number;
  name: string;
  isActive: boolean;
  lastActive: string;
}

export function ValveControlScreen({
  onValveChange,
}: {
  onValveChange?: (valveId: number, isActive: boolean) => void;
}) {
  const [valves, setValves] = useState<Valve[]>([
    { id: 1, name: 'North Field', isActive: true, lastActive: '2 hours ago' },
    { id: 2, name: 'South Field', isActive: false, lastActive: '5 hours ago' },
    { id: 3, name: 'East Field', isActive: true, lastActive: 'now' },
    { id: 4, name: 'West Field', isActive: false, lastActive: '1 hour ago' },
  ]);

  const handleValveToggle = (valveId: number, newState: boolean) => {
    setValves(
      valves.map((valve) =>
        valve.id === valveId
          ? { ...valve, isActive: newState, lastActive: newState ? 'now' : valve.lastActive }
          : valve
      )
    );
    onValveChange?.(valveId, newState);
  };

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <h1 className="text-2xl font-bold">Valve Control</h1>
        <p className="text-white text-opacity-80 text-sm mt-1">Manage your irrigation system</p>
      </div>

      {/* Valves List */}
      <div className="px-4 py-6 space-y-4">
        {valves.map((valve) => (
          <div
            key={valve.id}
            className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${
              valve.isActive ? 'border-2 border-[#2E7D32]' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-3 ${
                    valve.isActive ? 'bg-[#E8F5E9]' : 'bg-[#EEEEEE]'
                  }`}
                >
                  <Droplet
                    className={`w-6 h-6 ${
                      valve.isActive ? 'text-[#2E7D32]' : 'text-[#90A4AE]'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-[#263238] text-base">Valve {valve.id}</h3>
                  <p className="text-sm text-[#90A4AE]">{valve.name}</p>
                </div>
              </div>
              <Switch
                checked={valve.isActive}
                onCheckedChange={(checked) => handleValveToggle(valve.id, checked)}
              />
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E8EFE8]">
              <div
                className={`w-2 h-2 rounded-full ${
                  valve.isActive ? 'bg-[#2E7D32]' : 'bg-[#90A4AE]'
                }`}
              />
              <span className={`text-sm font-medium ${
                valve.isActive ? 'text-[#2E7D32]' : 'text-[#90A4AE]'
              }`}>
                {valve.isActive ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Last Active */}
            <div className="flex items-center gap-2 mt-2 text-xs text-[#90A4AE]">
              <Clock className="w-4 h-4" />
              <span>Last active: {valve.lastActive}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-24 pt-2">
        <button className="w-full bg-white border-2 border-[#2E7D32] text-[#2E7D32] rounded-2xl py-3 font-semibold mb-2">
          Turn All On
        </button>
        <button className="w-full bg-[#E8F5E9] text-[#2E7D32] rounded-2xl py-3 font-semibold">
          Turn All Off
        </button>
      </div>
    </div>
  );
}
