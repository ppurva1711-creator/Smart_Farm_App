"use client";
import { useState, useEffect } from 'react';
import { useLanguage } from '../app/context/LanguageContext';
import type { Language } from '../app/context/LanguageContext';
import { getClientAuthInstance, getClientDb } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { SplashScreen }       from './splash-screen';
import { LoginScreen }        from './login-screen';
import { DashboardScreen }    from './dashboard-screen';
import { ValveControlScreen } from './valve-control-screen';
import { AlertsScreen }       from './alerts-screen';
import ChatbotHelpScreen      from './chatbot-help-screen';
import { BottomNavigation }   from './bottom-navigation';

type AppState  = 'loading' | 'splash' | 'login' | 'app';
type ActiveTab = 'dashboard' | 'valves' | 'alerts' | 'help';

function AppContainerContent() {
  const [appState,  setAppState]  = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { setLanguage } = useLanguage();

  useEffect(() => {
    // Check saved language
    const savedLang = localStorage.getItem("sf_language") as Language | null;
    if (savedLang) setLanguage(savedLang);

    // Check if user already logged in via Firebase Auth
    const auth = getClientAuthInstance();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        localStorage.setItem("sf_uid", user.uid);
        // Check if device is linked
        const db       = getClientDb();
        const devSnap  = await get(ref(db, `users/${user.uid}/devices`));
        if (devSnap.exists()) {
          const deviceId = Object.keys(devSnap.val())[0];
          localStorage.setItem("sf_device_id", deviceId);
        }
        setAppState('app');
      } else {
        // Check localStorage as fallback
        const uid = localStorage.getItem("sf_uid");
        if (uid) {
          setAppState('app');
        } else {
          setAppState('splash');
        }
      }
    });
    return () => unsub();
  }, []);

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-green-700 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-pulse">🌾</div>
        <p className="text-white font-medium text-lg">Smart Farm</p>
      </div>
    );
  }

  if (appState === 'splash') {
    return <SplashScreen onComplete={() => setAppState('login')} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={() => setAppState('app')} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardScreen />;
      case 'valves':    return <ValveControlScreen />;
      case 'alerts':    return <AlertsScreen />;
      case 'help':      return <ChatbotHelpScreen />;
      default:          return <DashboardScreen />;
    }
  };

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