'use client';

import { LayoutDashboard, Droplet, Bell, HelpCircle } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'valves' | 'alerts' | 'help';
  onTabChange: (tab: 'dashboard' | 'valves' | 'alerts' | 'help') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'valves',
      label: 'Valves',
      icon: Droplet,
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8EFE8] px-2 py-2 flex items-center justify-around gap-1 z-40">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as any)}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-colors ${
              isActive
                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                : 'text-[#90A4AE] hover:bg-[#F4F8F4]'
            }`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className={`text-xs font-medium ${isActive ? 'text-[#2E7D32]' : 'text-[#90A4AE]'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
