// app/layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ROOT LAYOUT — this is why language wasn't working on all pages before.
// Both LanguageProvider and AuthProvider wrap EVERYTHING here.
// Every page, every component automatically gets language + auth.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../context/LanguageContext";
import { AuthProvider } from "../context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Farm",
  description: "Smart Farm IoT Control System",
  manifest: "/manifest.json",
  themeColor: "#16a34a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* LanguageProvider → every page can call useLanguage() */}
        <LanguageProvider>
          {/* AuthProvider → every page can call useAuth() */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
