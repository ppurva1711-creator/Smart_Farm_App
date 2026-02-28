'use client';

import { AlertTriangle, AlertCircle, Info, Zap, Droplet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: number;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  icon: React.ReactNode;
  iconBg: string;
}

export function AlertsScreen() {
  const alerts: Alert[] = [
    {
      id: 1,
      type: 'error',
      title: 'Power Cut Alert',
      message: 'System is currently operating on battery backup',
      timestamp: '2 minutes ago',
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-[#FFEBEE]',
    },
    {
      id: 2,
      type: 'error',
      title: 'Valve Error - North Field',
      message: 'Valve 1 is not responding. Please check connection',
      timestamp: '1 hour ago',
      icon: <Droplet className="w-6 h-6" />,
      iconBg: 'bg-[#FCE4EC]',
    },
    {
      id: 3,
      type: 'warning',
      title: 'Battery Cycle Limit',
      message: '3 of 4 daily cycles used. One cycle remaining',
      timestamp: '3 hours ago',
      icon: <Zap className="w-6 h-6" />,
      iconBg: 'bg-[#FFF3E0]',
    },
    {
      id: 4,
      type: 'warning',
      title: 'High Soil Moisture',
      message: 'Soil moisture in East Field exceeds normal levels',
      timestamp: '5 hours ago',
      icon: <AlertCircle className="w-6 h-6" />,
      iconBg: 'bg-[#FFF3E0]',
    },
    {
      id: 5,
      type: 'info',
      title: 'Valve Activated',
      message: 'South Field valve activated automatically',
      timestamp: '1 day ago',
      icon: <Info className="w-6 h-6" />,
      iconBg: 'bg-[#E3F2FD]',
    },
    {
      id: 6,
      type: 'info',
      title: 'System Update',
      message: 'Firmware updated to v2.5.1',
      timestamp: '2 days ago',
      icon: <Info className="w-6 h-6" />,
      iconBg: 'bg-[#E3F2FD]',
    },
  ];

  const getAlertStyles = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return { border: 'border-[#FFCDD2]', iconColor: 'text-[#E53935]' };
      case 'warning':
        return { border: 'border-[#FFE0B2]', iconColor: 'text-[#F57C00]' };
      case 'info':
        return { border: 'border-[#BBDEFB]', iconColor: 'text-[#1565C0]' };
    }
  };

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-white text-opacity-80 text-sm mt-1">System alerts and updates</p>
      </div>

      {/* Alerts List */}
      <div className="px-4 py-6">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Info className="w-12 h-12 text-[#90A4AE] mx-auto mb-3" />
            <p className="text-[#263238] font-medium">No alerts</p>
            <p className="text-[#90A4AE] text-sm mt-1">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const styles = getAlertStyles(alert.type);
              return (
                <div
                  key={alert.id}
                  className={`bg-white border-l-4 rounded-2xl p-4 ${styles.border}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 flex-shrink-0 ${alert.iconBg}`}>
                      <div className={styles.iconColor}>{alert.icon}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#263238] text-sm">{alert.title}</h3>
                      <p className="text-[#90A4AE] text-xs mt-1">{alert.message}</p>
                      <p className="text-[#90A4AE] text-xs mt-2">{alert.timestamp}</p>
                    </div>

                    <button className="text-[#90A4AE] hover:text-[#263238] flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear All Button */}
      {alerts.length > 0 && (
        <div className="px-4 pb-24">
          <Button className="w-full bg-white border-2 border-[#E8EFE8] text-[#263238] hover:bg-[#F4F8F4] h-12 rounded-2xl font-semibold">
            Clear All Notifications
          </Button>
        </div>
      )}
    </div>
  );
}
