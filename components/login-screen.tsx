"use client";
// components/login-screen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Complete OTP login with Firebase Phone Authentication
// Flow: Language select → Phone number → OTP → Profile setup → Dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { getClientAuthInstance, getClientDb } from "../lib/firebase";
import { ref, set, get } from "firebase/database";
import { useLanguage } from "../app/context/LanguageContext";
import type { Language } from "../app/context/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = "language" | "phone" | "otp" | "profile" | "setup";

interface ProfileData {
  fullName: string;
  address: string;
  village: string;
  district: string;
  state: string;
  deviceId: string;
  hardwareSimNumber: string;
  tankCapacityLitres: string;
}

const LANGUAGES = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "hi", label: "हिंदी",    flag: "🇮🇳" },
  { code: "mr", label: "मराठी",    flag: "🇮🇳" },
  { code: "pa", label: "ਪੰਜਾਬੀ",  flag: "🇮🇳" },
  { code: "te", label: "తెలుగు",   flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்",    flag: "🇮🇳" },
];

// ── UI Labels in all languages ─────────────────────────────────────────────────
const L: Record<string, Record<Language, string>> = {
  selectLang:   { en: "Select Language",          hi: "भाषा चुनें",          mr: "भाषा निवडा",         pa: "ਭਾਸ਼ਾ ਚੁਣੋ",        te: "భాష ఎంచుకోండి",      ta: "மொழி தேர்வு" },
  continue:     { en: "Continue",                 hi: "जारी रखें",           mr: "पुढे जा",             pa: "ਜਾਰੀ ਰੱਖੋ",         te: "కొనసాగించు",          ta: "தொடரவும்" },
  phoneTitle:   { en: "Enter Phone Number",       hi: "फोन नंबर दर्ज करें",  mr: "फोन नंबर टाका",       pa: "ਫ਼ੋਨ ਨੰਬਰ ਦਾਖਲ ਕਰੋ", te: "ఫోన్ నంబర్ నమోదు",   ta: "தொலைபேசி எண் உள்ளிடுக" },
  phoneSub:     { en: "We'll send you an OTP",    hi: "हम आपको OTP भेजेंगे", mr: "आम्ही OTP पाठवू",     pa: "ਅਸੀਂ OTP ਭੇਜਾਂਗੇ",  te: "మేము OTP పంపుతాము",  ta: "OTP அனுப்புவோம்" },
  sendOtp:      { en: "Send OTP",                 hi: "OTP भेजें",           mr: "OTP पाठवा",           pa: "OTP ਭੇਜੋ",           te: "OTP పంపు",            ta: "OTP அனுப்பு" },
  otpTitle:     { en: "Enter OTP",                hi: "OTP दर्ज करें",       mr: "OTP टाका",            pa: "OTP ਦਾਖਲ ਕਰੋ",       te: "OTP నమోదు చేయండి",   ta: "OTP உள்ளிடுக" },
  otpSub:       { en: "6-digit code sent to",     hi: "6 अंकों का कोड भेजा", mr: "6 अंकी कोड पाठवला",  pa: "6-ਅੰਕੀ ਕੋਡ ਭੇਜਿਆ",  te: "6 అంకెల కోడ్ పంపాము",ta: "6 இலக்க குறியீடு" },
  verify:       { en: "Verify & Login",           hi: "सत्यापित करें",       mr: "सत्यापित करा",        pa: "ਪੁਸ਼ਟੀ ਕਰੋ",         te: "ధృవీకరించండి",        ta: "சரிபார்க்கவும்" },
  resend:       { en: "Resend OTP",               hi: "OTP फिर भेजें",       mr: "OTP पुन्हा पाठवा",    pa: "OTP ਦੁਬਾਰਾ ਭੇਜੋ",   te: "OTP మళ్ళీ పంపు",     ta: "OTP மீண்டும் அனுப்பு" },
  profileTitle: { en: "Your Profile",             hi: "आपकी प्रोफ़ाइल",      mr: "तुमची प्रोफाइल",      pa: "ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ",    te: "మీ ప్రొఫైల్",         ta: "உங்கள் சுயவிவரம்" },
  profileSub:   { en: "Tell us about yourself",   hi: "अपने बारे में बताएं", mr: "स्वतःबद्दल सांगा",    pa: "ਆਪਣੇ ਬਾਰੇ ਦੱਸੋ",     te: "మీ గురించి చెప్పండి", ta: "உங்களைப் பற்றி சொல்லுங்கள்" },
  fullName:     { en: "Full Name",                hi: "पूरा नाम",            mr: "पूर्ण नाव",           pa: "ਪੂਰਾ ਨਾਮ",           te: "పూర్తి పేరు",         ta: "முழு பெயர்" },
  address:      { en: "Farm Address",             hi: "खेत का पता",          mr: "शेताचा पत्ता",        pa: "ਖੇਤ ਦਾ ਪਤਾ",          te: "పొలం చిరునామా",       ta: "பண்ணை முகவரி" },
  village:      { en: "Village / Town",           hi: "गाँव / शहर",          mr: "गाव / शहर",           pa: "ਪਿੰਡ / ਸ਼ਹਿਰ",        te: "గ్రామం / పట్టణం",     ta: "கிராமம் / நகரம்" },
  district:     { en: "District",                 hi: "जिला",                mr: "जिल्हा",              pa: "ਜ਼ਿਲ੍ਹਾ",             te: "జిల్లా",               ta: "மாவட்டம்" },
  state:        { en: "State",                    hi: "राज्य",               mr: "राज्य",               pa: "ਸੂਬਾ",               te: "రాష్ట్రం",             ta: "மாநிலம்" },
  saveProfile:  { en: "Save & Continue",          hi: "सहेजें और जारी रखें", mr: "जतन करा",             pa: "ਸੇਵ ਕਰੋ",             te: "సేవ్ చేయండి",         ta: "சேமிக்கவும்" },
  setupTitle:   { en: "Connect Hardware",         hi: "हार्डवेयर जोड़ें",    mr: "हार्डवेअर जोडा",      pa: "ਹਾਰਡਵੇਅਰ ਜੋੜੋ",       te: "హార్డ్‌వేర్ కనెక్ట్", ta: "வன்பொருள் இணைக்க" },
  deviceId:     { en: "Device ID",               hi: "डिवाइस ID",            mr: "डिव्हाइस ID",         pa: "ਡਿਵਾਈਸ ID",           te: "పరికర ID",             ta: "சாதன ID" },
  simNumber:    { en: "Hardware SIM Number",      hi: "हार्डवेयर SIM नंबर",  mr: "हार्डवेअर SIM नंबर",  pa: "ਹਾਰਡਵੇਅਰ SIM ਨੰਬਰ",  te: "హార్డ్‌వేర్ SIM",     ta: "வன்பொருள் SIM எண்" },
  tankCap:      { en: "Tank Capacity (Litres)",   hi: "टंकी क्षमता (लीटर)",  mr: "टाकी क्षमता (लिटर)",  pa: "ਟੈਂਕੀ ਸਮਰੱਥਾ (ਲੀਟਰ)", te: "ట్యాంక్ సామర్థ్యం",   ta: "தொட்டி திறன் (லிட்டர்)" },
  connect:      { en: "Connect Device",           hi: "डिवाइस कनेक्ट करें",  mr: "डिव्हाइस कनेक्ट करा", pa: "ਡਿਵਾਈਸ ਕਨੈਕਟ ਕਰੋ",   te: "పరికరాన్ని కనెక్ట్",  ta: "சாதனம் இணைக்க" },
  loading:      { en: "Please wait...",           hi: "कृपया प्रतीक्षा करें", mr: "कृपया थांबा...",       pa: "ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ",te: "దయచేసి వేచి ఉండండి",  ta: "காத்திருக்கவும்..." },
  skip:         { en: "Skip for now",             hi: "अभी के लिए छोड़ें",   mr: "आत्ता सोडा",          pa: "ਹੁਣ ਲਈ ਛੱਡੋ",         te: "ఇప్పుడు దాటవేయి",    ta: "இப்போது தவிர்க்கவும்" },
};

function label(key: string, lang: Language): string {
  return L[key]?.[lang] ?? L[key]?.en ?? key;
}

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { language, setLanguage } = useLanguage();
  const [step, setStep]           = useState<Step>("language");
  const [phone, setPhone]         = useState("");
  const [otp, setOtp]             = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [uid, setUid]             = useState("");
  const [profile, setProfile]     = useState<ProfileData>({
    fullName: "", address: "", village: "",
    district: "", state: "", deviceId: "",
    hardwareSimNumber: "", tankCapacityLitres: "2000",
  });

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef    = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
 const handleSendOtp = async () => {
  setError("");
  if (!phone.trim()) { setError("Enter phone number"); return; }

  const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/\s/g, "")}`;
  setLoading(true);

  try {
    const auth = getClientAuthInstance();

    // Always clean up old recaptcha completely
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch {}
      recaptchaRef.current = null;
    }

    // Reset the container HTML
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";

    // Small delay to ensure cleanup
    await new Promise(r => setTimeout(r, 300));

    recaptchaRef.current = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible", callback: () => {} }
    );

    const result = await signInWithPhoneNumber(
      auth, formatted, recaptchaRef.current
    );
    confirmationRef.current = result;
    setStep("otp");
    setCountdown(30);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("invalid-phone")) {
      setError("Invalid phone number. Use format: 9876543210");
    } else if (msg.includes("too-many-requests")) {
      setError("Too many attempts. Wait a few minutes.");
    } else if (msg.includes("billing-not-enabled")) {
      setError("Real SMS not enabled. Use test number: +919529273752 with OTP: 123456");
    } else {
      setError(msg);
    }
  } finally {
    setLoading(false);
  }
};

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length !== 6) { setError("Enter 6-digit OTP"); return; }
    setLoading(true);

    try {
      const result = await confirmationRef.current!.confirm(otp);
      const firebaseUid = result.user.uid;
      setUid(firebaseUid);

      // Check if profile already exists
      const db   = getClientDb();
      const snap = await get(ref(db, `users/${firebaseUid}/profile`));

      if (snap.exists()) {
        // Returning user — go straight to dashboard
        localStorage.setItem("sf_uid", firebaseUid);
        const deviceSnap = await get(ref(db, `users/${firebaseUid}/devices`));
        if (deviceSnap.exists()) {
          const deviceId = Object.keys(deviceSnap.val())[0];
          localStorage.setItem("sf_device_id", deviceId);
        }
        onLoginSuccess();
      } else {
        // New user — collect profile
        setStep("profile");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      if (msg.includes("invalid-verification-code")) setError("Wrong OTP. Try again.");
      else if (msg.includes("code-expired")) setError("OTP expired. Request a new one.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Save Profile ────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setError("");
    if (!profile.fullName.trim()) { setError("Please enter your name"); return; }
    setLoading(true);

    try {
      const db = getClientDb();
      await set(ref(db, `users/${uid}/profile`), {
        ...profile,
        phone: phone.startsWith("+") ? phone : `+91${phone}`,
        language,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      localStorage.setItem("sf_uid", uid);
      setStep("setup");
    } catch (err) {
      setError("Failed to save profile. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Connect Hardware ────────────────────────────────────────────────
  const handleConnectDevice = async () => {
    setError("");
    if (!profile.deviceId.trim()) { setError("Enter Device ID"); return; }
    setLoading(true);

    try {
      const db = getClientDb();
      const deviceId = profile.deviceId.trim();

      await set(ref(db, `devices/${deviceId}/config`), {
        ownerId:            uid,
        hardwareSimNumber:  profile.hardwareSimNumber,
        tankCapacityLitres: parseInt(profile.tankCapacityLitres) || 2000,
      });
      await set(ref(db, `users/${uid}/devices/${deviceId}`), true);
      localStorage.setItem("sf_device_id", deviceId);
      onLoginSuccess();
    } catch {
      setError("Failed to connect device.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex flex-col">

      {/* ── STEP: Language Selection ── */}
      {step === "language" && (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col items-center pt-16 pb-8">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-xl">
              <span className="text-5xl">🌾</span>
            </div>
            <h1 className="text-white text-3xl font-bold">Smart Farm</h1>
            <p className="text-green-200 text-sm mt-1">IoT Control System</p>
          </div>
          <div className="flex-1 bg-white rounded-t-3xl p-6">
            <h2 className="text-gray-800 text-xl font-bold mb-1 text-center">
              {label("selectLang", language)}
            </h2>
            <p className="text-gray-400 text-sm text-center mb-6">Choose your language / अपनी भाषा चुनें</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code as Language)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    language === l.code
                      ? "border-green-500 bg-green-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{l.flag}</span>
                  <p className={`font-semibold text-sm mt-1 ${language === l.code ? "text-green-700" : "text-gray-700"}`}>
                    {l.label}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("phone")}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-4 text-lg transition-colors"
            >
              {label("continue", language)} →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Phone Number ── */}
      {step === "phone" && (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col items-center pt-12 pb-6">
            <div className="text-5xl mb-3">📱</div>
            <h1 className="text-white text-2xl font-bold">{label("phoneTitle", language)}</h1>
            <p className="text-green-200 text-sm mt-1">{label("phoneSub", language)}</p>
          </div>
          <div className="flex-1 bg-white rounded-t-3xl p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}
            <label className="text-gray-700 text-sm font-medium block mb-2">
              {label("phoneTitle", language)}
            </label>
            <div className="flex gap-2 mb-2">
              <div className="bg-gray-100 rounded-xl px-4 py-3 text-gray-600 font-medium">+91</div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-lg tracking-wider focus:outline-none focus:border-green-500"
                onKeyDown={e => e.key === "Enter" && handleSendOtp()}
              />
            </div>
            <p className="text-gray-400 text-xs mb-6">Enter 10-digit mobile number</p>
            <div id="recaptcha-container" />
            <button
              onClick={handleSendOtp}
              disabled={loading || phone.length < 10}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 transition-colors"
            >
              {loading ? label("loading", language) : label("sendOtp", language)}
            </button>
            <button onClick={() => setStep("language")} className="w-full text-gray-400 text-sm py-3 mt-2">
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: OTP Verification ── */}
      {step === "otp" && (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col items-center pt-12 pb-6">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-white text-2xl font-bold">{label("otpTitle", language)}</h1>
            <p className="text-green-200 text-sm mt-1">{label("otpSub", language)} +91{phone}</p>
          </div>
          <div className="flex-1 bg-white rounded-t-3xl p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}
            <label className="text-gray-700 text-sm font-medium block mb-2">{label("otpTitle", language)}</label>
            <input
              type="number"
              value={otp}
              onChange={e => setOtp(e.target.value.slice(0, 6))}
              placeholder="• • • • • •"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-800 text-3xl text-center tracking-[0.5em] focus:outline-none focus:border-green-500 mb-6"
              onKeyDown={e => e.key === "Enter" && otp.length === 6 && handleVerifyOtp()}
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 transition-colors mb-3"
            >
              {loading ? label("loading", language) : label("verify", language)}
            </button>
            <button
              onClick={handleSendOtp}
              disabled={countdown > 0 || loading}
              className="w-full text-green-600 disabled:text-gray-400 text-sm py-2"
            >
              {countdown > 0 ? `${label("resend", language)} (${countdown}s)` : label("resend", language)}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Profile Setup ── */}
      {step === "profile" && (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col items-center pt-10 pb-4">
            <div className="text-5xl mb-3">👨‍🌾</div>
            <h1 className="text-white text-2xl font-bold">{label("profileTitle", language)}</h1>
            <p className="text-green-200 text-sm mt-1">{label("profileSub", language)}</p>
          </div>
          <div className="flex-1 bg-white rounded-t-3xl p-6 overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              {[
                { key: "fullName",  label: label("fullName",  language), placeholder: "Ramesh Patil",        required: true  },
                { key: "address",   label: label("address",   language), placeholder: "Survey No. 45",       required: false },
                { key: "village",   label: label("village",   language), placeholder: "Nashik",              required: false },
                { key: "district",  label: label("district",  language), placeholder: "Nashik District",     required: false },
                { key: "state",     label: label("state",     language), placeholder: "Maharashtra",         required: false },
              ].map(({ key, label: lbl, placeholder, required }) => (
                <div key={key}>
                  <label className="text-gray-700 text-sm font-medium block mb-1">
                    {lbl} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={profile[key as keyof ProfileData]}
                    onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-green-500 focus:bg-white"
                  />
                </div>
              ))}

              {/* Phone (read-only) */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">Phone</label>
                <input
                  type="text"
                  value={`+91 ${phone}`}
                  disabled
                  className="w-full border border-gray-100 bg-gray-100 rounded-xl px-4 py-3 text-gray-400"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading || !profile.fullName.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 mt-6 transition-colors"
            >
              {loading ? label("loading", language) : label("saveProfile", language)}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Hardware Setup ── */}
      {step === "setup" && (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col items-center pt-10 pb-4">
            <div className="text-5xl mb-3">📡</div>
            <h1 className="text-white text-2xl font-bold">{label("setupTitle", language)}</h1>
            <p className="text-green-200 text-sm mt-1 text-center px-6">Link your Smart Farm device</p>
          </div>
          <div className="flex-1 bg-white rounded-t-3xl p-6 overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-amber-800 text-xs font-medium mb-1">📋 Where to find these?</p>
              <p className="text-amber-700 text-xs">• Device ID: sticker on hardware box</p>
              <p className="text-amber-700 text-xs">• Hardware SIM: SIM card inside device</p>
            </div>

            <div className="space-y-4">
              {[
                { key: "deviceId",           label: label("deviceId",  language), placeholder: "farm_001",         required: true  },
                { key: "hardwareSimNumber",   label: label("simNumber", language), placeholder: "+919876543210",    required: false },
                { key: "tankCapacityLitres",  label: label("tankCap",   language), placeholder: "2000",             required: false },
              ].map(({ key, label: lbl, placeholder, required }) => (
                <div key={key}>
                  <label className="text-gray-700 text-sm font-medium block mb-1">
                    {lbl} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={profile[key as keyof ProfileData]}
                    onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-green-500 focus:bg-white font-mono"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleConnectDevice}
              disabled={loading || !profile.deviceId.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 mt-6 transition-colors"
            >
              {loading ? label("loading", language) : label("connect", language)}
            </button>

            <button
              onClick={onLoginSuccess}
              className="w-full text-gray-400 text-sm py-3 mt-2"
            >
              {label("skip", language)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
