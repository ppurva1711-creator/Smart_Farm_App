'use client';

import { useState } from 'react';
import { LanguageProvider } from '@/context/language-context';
import { SplashScreen } from './splash-screen';
import { LoginScreen } from './login-screen';
import { DashboardScreen } from './dashboard-screen';
import { ValveControlScreen } from './valve-control-screen';
import { BatteryScreen } from './battery-screen';
import { AlertsScreen } from './alerts-screen';
import { ChatbotHelpScreen } from './chatbot-help-screen';
import { BottomNavigation } from './bottom-navigation';

type AppState = 'splash' | 'login' | 'app';
type ActiveTab = 'dashboard' | 'valves' | 'alerts' | 'help';

function AppContainerContent() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const handleSplashComplete = () => {
    setAppState('login');
  };

  const handleLoginSuccess = () => {
    setAppState('app');
  };

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="bg-[#F4F8F4]">
      {/* Render Active Tab */}
      {activeTab === 'dashboard' && <DashboardScreen userName="Rajesh" />}
      {activeTab === 'valves' && <ValveControlScreen />}
      {activeTab === 'alerts' && <AlertsScreen />}
      {activeTab === 'help' && <ChatbotHelpScreen />}

      {/* Battery Screen - accessible as a feature (could be modal or separate route) */}
      {/* Uncomment to test: <BatteryScreen /> */}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export function AppContainer() {
  return (
    <LanguageProvider>
      <AppContainerContent />
    </LanguageProvider>
  );
}
