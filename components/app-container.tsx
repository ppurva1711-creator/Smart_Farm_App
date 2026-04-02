"use client";
// components/app-container.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Main app shell — handles splash → login → app flow
// Now integrated with Android bridge for native features
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useLanguage } from '../app/context/LanguageContext';
import type { Language } from '../app/context/LanguageContext';
import { SplashScreen }       from './splash-screen';
import { LoginScreen }        from './login-screen';
import { DashboardScreen }    from './dashboard-screen';
import { ValveControlScreen } from './valve-control-screen';
import { BatteryScreen }      from './battery-screen';
import { AlertsScreen }       from './alerts-screen';
import ChatbotHelpScreen      from './chatbot-help-screen';
import { BottomNavigation }   from './bottom-navigation';
import { useAndroidBridge }   from '../hooks/useAndroidBridge';

type AppState  = 'splash' | 'login' | 'app';
type ActiveTab = 'dashboard' | 'valves' | 'alerts' | 'help';

function AppContainerContent() {
  const [appState,   setAppState]   = useState<AppState>('splash');
  const [activeTab,  setActiveTab]  = useState<ActiveTab>('dashboard');
  const { setLanguage }             = useLanguage();
  const bridge                      = useAndroidBridge();

  // ── On mount: detect Android language + restore login state ──────────────
  useEffect(() => {
    // Auto-set language from Android device language
    if (bridge.isAndroid) {
      const deviceLang = bridge.getDeviceLanguage() as Language;
      const saved      = localStorage.getItem("sf_language") as Language | null;
      if (!saved) setLanguage(deviceLang);
    }

    // Check if user is already logged in
    const uid      = localStorage.getItem("sf_uid");
    const deviceId = localStorage.getItem("sf_device_id")
                  || bridge.getAndroidDeviceId();

    if (uid && deviceId) {
      // Returning user — skip splash and login
      setAppState('app');
    }
  }, [bridge.isAndroid]);

  const handleSplashComplete = () => setAppState('login');
  const handleLoginSuccess   = () => setAppState('app');

  // ── Render active tab ─────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardScreen />;
      case 'valves':    return <ValveControlScreen />;
      case 'alerts':    return <AlertsScreen />;
      case 'help':      return <ChatbotHelpScreen />;
      default:          return <DashboardScreen />;
    }
  };

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {renderTab()}
      </div>
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
      />
    </div>
  );
}

export default function AppContainer() {
  return <AppContainerContent />;
}