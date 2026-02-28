'use client';

import { useEffect, useState } from 'react';
import { Droplet, Leaf } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] flex items-center justify-center z-50">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <Leaf className="w-12 h-12 text-white" />
            <Droplet className="absolute w-6 h-6 text-blue-400 bottom-0 right-0" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 font-sans">Smart Farm</h1>
        <p className="text-white text-opacity-80 text-sm tracking-widest">CONTROL SYSTEM</p>
      </div>
    </div>
  );
}
