"use client";
// context/AuthContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Manages Firebase Phone Auth state across the whole app.
// Wrap this around your app in layout.tsx — same level as LanguageProvider.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import { getClientAuthInstance } from "../../lib/firebase";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  // Step 1: send OTP
  sendOtp: (phoneNumber: string) => Promise<void>;
  // Step 2: verify OTP
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  otpSent: boolean;
  authError: string | null;
  clearError: () => void;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent]     = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [idToken, setIdToken]     = useState<string | null>(null);

  // Listen for auth state changes (persists login across app restarts)
  useEffect(() => {
    const auth = getClientAuthInstance();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const sendOtp = async (phoneNumber: string) => {
    setAuthError(null);
    try {
      const auth = getClientAuthInstance();

      // Invisible reCAPTCHA — required by Firebase Phone Auth
      // The div#recaptcha-container must exist in your login page
      const recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });

      // Format: must be E.164 → +919876543210
      const formatted = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formatted, recaptcha);
      setConfirmation(result);
      setOtpSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      // Give user-friendly messages
      if (msg.includes("invalid-phone-number")) {
        setAuthError("Invalid phone number. Use format: +919876543210");
      } else if (msg.includes("too-many-requests")) {
        setAuthError("Too many attempts. Please wait a few minutes.");
      } else if (msg.includes("billing")) {
        setAuthError("OTP service not active. Contact support.");
      } else {
        setAuthError(msg);
      }
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const verifyOtp = async (code: string) => {
    setAuthError(null);
    if (!confirmation) {
      setAuthError("Please request OTP first");
      return;
    }
    try {
      const result = await confirmation.confirm(code);
      const token  = await result.user.getIdToken();
      setUser(result.user);
      setIdToken(token);
      setOtpSent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      if (msg.includes("invalid-verification-code")) {
        setAuthError("Wrong OTP. Please check and try again.");
      } else if (msg.includes("code-expired")) {
        setAuthError("OTP expired. Please request a new one.");
      } else {
        setAuthError(msg);
      }
    }
  };

  const logout = async () => {
    const auth = getClientAuthInstance();
    await signOut(auth);
    setUser(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, sendOtp, verifyOtp,
      logout, otpSent, authError,
      clearError: () => setAuthError(null),
      idToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
