"use client";
// components/AuthGuard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrap any page with <AuthGuard> to require login.
// Automatically redirects to /login if not authenticated.
// Shows a loading spinner while Firebase auth is initializing.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../app/context/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
        <div className="text-5xl mb-4 animate-pulse">🌾</div>
        <p className="text-green-700 font-medium">Smart Farm</p>
        <p className="text-gray-400 text-sm mt-1">Loading...</p>
      </div>
    );
  }

  if (!user) return null; // Will redirect

  return <>{children}</>;
}
