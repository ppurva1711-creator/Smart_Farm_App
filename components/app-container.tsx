"use client";
// components/app-container.tsx — FIXED
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS WRONG:
// 1. Was importing LanguageProvider from '@/context/LanguageContext' — wrong path
//    AND wrong — LanguageProvider is already in layout.tsx, don't import it here
// 2. Was importing './chatbot-help-screen' which didn't exist — now it does
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useLanguage } from '../app/context/LanguageContext';
import { SplashScreen } from './splash-screen';
import { LoginScreen } from './login-screen';
import { DashboardScreen } from './dashboard-screen';
import { ValveControlScreen } from './valve-control-screen';
import { BatteryScreen } from './battery-screen';
import { AlertsScreen } from './alerts-screen';
import ChatbotHelpScreen from './chatbot-help-screen';
import { BottomNavigation } from './bottom-navigation';

type AppState = 'splash' | 'login' | 'app';
type ActiveTab = 'dashboard' | 'valves' | 'alerts' | 'help';

function AppContainerContent() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { t, language, setLanguage } = useLanguage();

  const handleSplashComplete = () => {
    setAppState('login');
  };

  const handleLoginSuccess = () => {
    setAppState('app');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'valves':
        return <ValveControlScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'help':
        return <ChatbotHelpScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-1 overflow-hidden">
        {renderActiveTab()}
      </div>
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

export default function AppContainer() {
  // NOTE: LanguageProvider is in layout.tsx — DO NOT add it here again
  // Adding it twice would reset the language on every render
  return <AppContainerContent />;
}
