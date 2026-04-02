"use client";
// hooks/useAndroidBridge.ts
// ─────────────────────────────────────────────────────────────────────────────
// Detects when the web app is running inside the Android WebView
// and exposes native Android features to React components
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";

// Type definition for the Android bridge
interface AndroidBridge {
  getDeviceLanguage: () => string;
  isAndroidApp: () => boolean;
  getDeviceId: () => string;
  saveDeviceId: (id: string) => void;
  requestLocation: (callbackName: string) => void;
  showNotification: (title: string, message: string) => void;
  isNetworkAvailable: () => boolean;
  vibrate: () => void;
  shareText: (text: string) => void;
  openMaps: (lat: number, lng: number) => void;
  getAppInfo: () => string;
}

// Extend window type
declare global {
  interface Window {
    AndroidBridge?: AndroidBridge;
    __ANDROID_APP__?: boolean;
    __DEVICE_ID__?: string;
    onLocationResult?: (location: { lat: number; lng: number; accuracy: number; source: string }) => void;
    AndroidBridgeReady?: boolean;
  }
}

export function useAndroidBridge() {
  const [isAndroid,   setIsAndroid]   = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);

  useEffect(() => {
    // Check if running in Android WebView
    const checkBridge = () => {
      if (window.AndroidBridge || window.__ANDROID_APP__) {
        setIsAndroid(true);
        setBridgeReady(true);
      }
    };

    checkBridge();

    // Also listen for the bridge ready event fired by MainActivity
    window.addEventListener("AndroidBridgeReady", checkBridge);
    return () => window.removeEventListener("AndroidBridgeReady", checkBridge);
  }, []);

  // ── Get device language ───────────────────────────────────────────────────
  const getDeviceLanguage = useCallback((): string => {
    if (window.AndroidBridge) {
      return window.AndroidBridge.getDeviceLanguage();
    }
    return navigator.language.slice(0, 2) ?? "en";
  }, []);

  // ── Request GPS location ──────────────────────────────────────────────────
  const requestNativeLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (window.AndroidBridge) {
        // Set global callback that Android will call
        window.onLocationResult = (location) => {
          resolve({ lat: location.lat, lng: location.lng });
        };
        window.AndroidBridge.requestLocation("onLocationResult");
        // Timeout after 30 seconds
        setTimeout(() => reject(new Error("Location timeout")), 30000);
      } else {
        // Fallback to browser geolocation
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 15000 }
        );
      }
    });
  }, []);

  // ── Show native notification ──────────────────────────────────────────────
  const showNotification = useCallback((title: string, message: string) => {
    if (window.AndroidBridge) {
      window.AndroidBridge.showNotification(title, message);
    }
  }, []);

  // ── Vibrate on valve toggle ───────────────────────────────────────────────
  const vibrate = useCallback(() => {
    if (window.AndroidBridge) {
      window.AndroidBridge.vibrate();
    } else if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, []);

  // ── Share farm data ───────────────────────────────────────────────────────
  const shareText = useCallback((text: string) => {
    if (window.AndroidBridge) {
      window.AndroidBridge.shareText(text);
    } else if (navigator.share) {
      navigator.share({ text });
    }
  }, []);

  // ── Open maps ─────────────────────────────────────────────────────────────
  const openMaps = useCallback((lat: number, lng: number) => {
    if (window.AndroidBridge) {
      window.AndroidBridge.openMaps(lat, lng);
    } else {
      window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank");
    }
  }, []);

  // ── Get saved device ID from Android SharedPreferences ───────────────────
  const getAndroidDeviceId = useCallback((): string => {
    if (window.AndroidBridge) {
      return window.AndroidBridge.getDeviceId() ?? "";
    }
    return localStorage.getItem("sf_device_id") ?? "";
  }, []);

  // ── Save device ID to Android SharedPreferences ───────────────────────────
  const saveAndroidDeviceId = useCallback((id: string) => {
    if (window.AndroidBridge) {
      window.AndroidBridge.saveDeviceId(id);
    }
    localStorage.setItem("sf_device_id", id);
  }, []);

  return {
    isAndroid,
    bridgeReady,
    getDeviceLanguage,
    requestNativeLocation,
    showNotification,
    vibrate,
    shareText,
    openMaps,
    getAndroidDeviceId,
    saveAndroidDeviceId,
  };
}