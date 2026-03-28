"use client";
// app/setup/page.tsx — FIXED (added React import to fix jsx-runtime error)

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function SetupPage() {
  const router = useRouter();
  const { user, idToken } = useAuth();
  const { t } = useLanguage();

  const [deviceId,     setDeviceId]     = useState("");
  const [hardwareSim,  setHardwareSim]  = useState("");
  const [tankCapacity, setTankCapacity] = useState("2000");
  const [connecting,   setConnecting]   = useState(false);
  const [error,        setError]        = useState("");
  const [step,         setStep]         = useState(1);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const handleConnect = async () => {
    if (!deviceId.trim() || !hardwareSim.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (!hardwareSim.startsWith("+")) {
      setError("Hardware SIM must start with + (e.g. +919876543210)");
      return;
    }
    setError("");
    setConnecting(true);

    try {
      const res = await fetch("/api/auth/setup-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          phone: user?.phoneNumber,
          hardwareSimNumber: hardwareSim.trim(),
          tankCapacityLitres: parseInt(tankCapacity) || 2000,
          language: "en",
          deviceId: deviceId.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Connection failed");
        return;
      }

      localStorage.setItem("sf_device_id", deviceId.trim());
      setStep(2);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setConnecting(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-800 text-center mb-2">Device Connected!</h2>
        <p className="text-gray-600 text-center mb-8">
          Your Smart Farm hardware is now linked. Make sure the device is powered on.
        </p>
        <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-sm mb-6">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Device ID</span>
            <span className="font-mono text-gray-800">{deviceId}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Tank Capacity</span>
            <span className="text-gray-800">{tankCapacity} L</span>
          </div>
        </div>
        <button
          onClick={() => router.replace("/")}
          className="w-full max-w-sm bg-green-600 text-white font-semibold rounded-xl py-3"
        >
          Go to Dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h1 className="text-lg font-bold">{t("setupTitle")}</h1>
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto">
        <div className="bg-green-50 rounded-2xl p-5 text-center">
          <div className="text-5xl mb-2">📡</div>
          <p className="text-green-800 text-sm font-medium">{t("setupSubtitle")}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="text-gray-700 text-sm font-medium block mb-1">{t("deviceId")}</label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g. farm_001"
            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-gray-800 font-mono focus:outline-none focus:border-green-500"
          />
          <p className="text-gray-400 text-xs mt-1">📦 {t("deviceIdHint")}</p>
        </div>

        <div>
          <label className="text-gray-700 text-sm font-medium block mb-1">{t("hardwareSim")}</label>
          <input
            type="tel"
            value={hardwareSim}
            onChange={(e) => setHardwareSim(e.target.value)}
            placeholder="+919876543210"
            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-green-500"
          />
          <p className="text-gray-400 text-xs mt-1">📱 {t("hardwareSimHint")}</p>
        </div>

        <div>
          <label className="text-gray-700 text-sm font-medium block mb-1">{t("tankCapacity")}</label>
          <input
            type="number"
            value={tankCapacity}
            onChange={(e) => setTankCapacity(e.target.value)}
            placeholder="2000"
            className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-green-500"
          />
          <p className="text-gray-400 text-xs mt-1">💧 Common: 500, 1000, 2000, 5000 litres</p>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting || !deviceId.trim() || !hardwareSim.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          {connecting ? t("loading") : t("connectDevice")}
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm font-medium mb-2">📋 Where to find these?</p>
          <ul className="text-amber-700 text-xs space-y-1">
            <li>• <strong>Device ID</strong>: White sticker on bottom of hardware box</li>
            <li>• <strong>Hardware SIM</strong>: SIM card number inserted inside device</li>
            <li>• <strong>Tank size</strong>: Number printed on your water tank</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
