"use client";
import { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { getClientAuthInstance, getClientDb } from "../lib/firebase";
import { ref, get, set } from "firebase/database";
import { useLanguage } from "../app/context/LanguageContext";
import type { Language } from "../app/context/LanguageContext";

type Step = "language" | "phone" | "otp" | "profile" | "setup";

const LANGUAGES = [
  { code: "en", label: "English",  native: "English"  },
  { code: "hi", label: "Hindi",    native: "हिंदी"    },
  { code: "mr", label: "Marathi",  native: "मराठी"    },
  { code: "pa", label: "Punjabi",  native: "ਪੰਜਾਬੀ"  },
  { code: "te", label: "Telugu",   native: "తెలుగు"   },
  { code: "ta", label: "Tamil",    native: "தமிழ்"    },
];

const L: Record<string, Record<string, string>> = {
  phoneTitle:  { en:"Enter Phone Number", hi:"फ़ोन नंबर दर्ज करें", mr:"फोन नंबर टाका", pa:"ਫ਼ੋਨ ਨੰਬਰ", te:"ఫోన్ నంబర్", ta:"தொலைபேசி எண்" },
  sendOtp:     { en:"Send OTP",           hi:"OTP भेजें",          mr:"OTP पाठवा",     pa:"OTP ਭੇਜੋ",    te:"OTP పంపు",    ta:"OTP அனுப்பு" },
  otpLabel:    { en:"Enter OTP",          hi:"OTP दर्ज करें",       mr:"OTP टाका",      pa:"OTP ਦਾਖਲ",    te:"OTP నమోదు",   ta:"OTP உள்ளிடு" },
  verify:      { en:"Verify & Login",     hi:"सत्यापित करें",       mr:"सत्यापित करा",  pa:"ਪੁਸ਼ਟੀ ਕਰੋ",  te:"ధృవీకరించు",  ta:"சரிபார்" },
  resend:      { en:"Resend OTP",         hi:"OTP फिर भेजें",       mr:"OTP पुन्हा",    pa:"OTP ਦੁਬਾਰਾ",  te:"మళ్ళీ పంపు",  ta:"மீண்டும்" },
  fullName:    { en:"Full Name",          hi:"पूरा नाम",            mr:"पूर्ण नाव",     pa:"ਪੂਰਾ ਨਾਮ",    te:"పూర్తి పేరు", ta:"முழு பெயர்" },
  village:     { en:"Village/Town",       hi:"गाँव/शहर",            mr:"गाव/शहर",       pa:"ਪਿੰਡ/ਸ਼ਹਿਰ",  te:"గ్రామం",      ta:"கிராமம்" },
  district:    { en:"District",           hi:"जिला",                mr:"जिल्हा",        pa:"ਜ਼ਿਲ੍ਹਾ",      te:"జిల్లా",      ta:"மாவட்டம்" },
  state:       { en:"State",              hi:"राज्य",               mr:"राज्य",         pa:"ਸੂਬਾ",        te:"రాష్ట్రం",    ta:"மாநிலம்" },
  saveProfile: { en:"Save & Continue",    hi:"सहेजें",              mr:"जतन करा",       pa:"ਸੇਵ ਕਰੋ",     te:"సేవ్ చేయి",   ta:"சேமி" },
  deviceId:    { en:"Device ID",          hi:"डिवाइस ID",           mr:"डिव्हाइस ID",   pa:"ਡਿਵਾਈਸ ID",   te:"పరికర ID",    ta:"சாதன ID" },
  simNum:      { en:"Hardware SIM No.",   hi:"हार्डवेयर SIM",       mr:"हार्डवेअर SIM", pa:"ਹਾਰਡਵੇਅਰ SIM",te:"హార్డ్‌వేర్ SIM",ta:"வன்பொருள் SIM" },
  tankLitres:  { en:"Tank Capacity (L)",  hi:"टंकी (लीटर)",         mr:"टाकी (लिटर)",   pa:"ਟੈਂਕੀ (ਲੀਟਰ)",te:"ట్యాంక్ (L)", ta:"தொட்டி (L)" },
  connect:     { en:"Connect Device",     hi:"डिवाइस जोड़ें",       mr:"जोडा",          pa:"ਕਨੈਕਟ ਕਰੋ",   te:"కనెక్ట్",     ta:"இணைக்க" },
  skip:        { en:"Skip for now",       hi:"अभी छोड़ें",          mr:"आत्ता सोडा",    pa:"ਹੁਣ ਛੱਡੋ",    te:"దాటవేయి",    ta:"தவிர்" },
  loading:     { en:"Please wait...",     hi:"प्रतीक्षा करें",      mr:"थांबा...",       pa:"ਉਡੀਕ ਕਰੋ",    te:"వేచి ఉండండి", ta:"காத்திருங்கள்" },
  selectLang:  { en:"Select Language",    hi:"भाषा चुनें",          mr:"भाषा निवडा",    pa:"ਭਾਸ਼ਾ ਚੁਣੋ",  te:"భాష ఎంచుకో",  ta:"மொழி தேர்வு" },
  continue:    { en:"Continue →",         hi:"जारी रखें →",         mr:"पुढे जा →",     pa:"ਜਾਰੀ ਰੱਖੋ →", te:"కొనసాగించు →",ta:"தொடர் →" },
};

function tl(key: string, lang: string): string {
  return L[key]?.[lang] ?? L[key]?.en ?? key;
}

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { language, setLanguage } = useLanguage();
  const [step,       setStep]      = useState<Step>("language");
  const [phone,      setPhone]     = useState("");
  const [otp,        setOtp]       = useState("");
  const [error,      setError]     = useState("");
  const [loading,    setLoading]   = useState(false);
  const [countdown,  setCd]        = useState(0);
  const [uid,        setUid]       = useState("");
  const [profile,    setProfile]   = useState({ fullName:"", village:"", district:"", state:"" });
  const [setup,      setSetup]     = useState({ deviceId:"", hardwareSim:"", tank:"2000" });
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const recapRef   = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCd(c => c-1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const sendOtp = async () => {
    setError(""); setLoading(true);
    try {
      const auth = getClientAuthInstance();
      if (recapRef.current) { try { recapRef.current.clear(); } catch {} recapRef.current = null; }
      const container = document.getElementById("recap-container");
      if (container) container.innerHTML = "";

      recapRef.current = new RecaptchaVerifier(auth, "recap-container", { size:"invisible", callback:()=>{} });
      const fmt = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g,"")}`;
      const result = await signInWithPhoneNumber(auth, fmt, recapRef.current);
      confirmRef.current = result;
      setStep("otp"); setCd(30);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("billing-not-enabled")) setError("Add test number in Firebase Console or enable billing");
      else if (msg.includes("invalid-phone")) setError("Invalid phone number format");
      else if (msg.includes("too-many-requests")) setError("Too many attempts. Wait a few minutes.");
      else setError(msg);
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setError(""); setLoading(true);
    try {
      const result = await confirmRef.current!.confirm(otp);
      const firebaseUid = result.user.uid;
      setUid(firebaseUid);
      localStorage.setItem("sf_uid", firebaseUid);
      const db   = getClientDb();
      const snap = await get(ref(db, `users/${firebaseUid}/profile`));
      if (snap.exists()) {
        const devSnap = await get(ref(db, `users/${firebaseUid}/devices`));
        if (devSnap.exists()) {
          const deviceId = Object.keys(devSnap.val())[0];
          localStorage.setItem("sf_device_id", deviceId);
        }
        onLoginSuccess();
      } else { setStep("profile"); }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid OTP";
      if (msg.includes("invalid-verification-code")) setError("Wrong OTP. Check and retry.");
      else if (msg.includes("code-expired")) setError("OTP expired. Request a new one.");
      else setError(msg);
    } finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!profile.fullName.trim()) { setError("Name is required"); return; }
    setLoading(true);
    try {
      const db = getClientDb();
      await set(ref(db, `users/${uid}/profile`), {
        ...profile, phone: phone.startsWith("+") ? phone : `+91${phone}`,
        language, createdAt: Date.now(), updatedAt: Date.now(),
      });
      setStep("setup");
    } catch { setError("Failed to save profile"); }
    finally { setLoading(false); }
  };

  const connectDevice = async () => {
    if (!setup.deviceId.trim()) { setError("Device ID is required"); return; }
    setLoading(true);
    try {
      const db       = getClientDb();
      const deviceId = setup.deviceId.trim();
      await set(ref(db, `devices/${deviceId}/config`), {
        ownerId: uid, hardwareSimNumber: setup.hardwareSim,
        tankCapacityLitres: parseInt(setup.tank) || 2000,
      });
      await set(ref(db, `users/${uid}/devices/${deviceId}`), true);
      // Initialize valves if not exist
      const valvSnap = await get(ref(db, `devices/${deviceId}/valves`));
      if (!valvSnap.exists()) {
        await set(ref(db, `devices/${deviceId}/valves`), {
          valve1: { desiredState:false, hardwareState:false, label:"North Field", flowRateLPM:10 },
          valve2: { desiredState:false, hardwareState:false, label:"South Field", flowRateLPM:10 },
          valve3: { desiredState:false, hardwareState:false, label:"East Field",  flowRateLPM:10 },
          valve4: { desiredState:false, hardwareState:false, label:"West Field",  flowRateLPM:10 },
        });
      }
      localStorage.setItem("sf_device_id", deviceId);
      onLoginSuccess();
    } catch { setError("Failed to connect device"); }
    finally { setLoading(false); }
  };

  // ── RENDER LANGUAGE STEP ────────────────────────────────────
  if (step === "language") return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex flex-col">
      <div className="flex flex-col items-center pt-16 pb-8">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-xl">
          <span className="text-5xl">🌾</span>
        </div>
        <h1 className="text-white text-3xl font-bold">Smart Farm</h1>
        <p className="text-green-200 text-sm mt-1">IoT Control System</p>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl p-6">
        <h2 className="text-xl font-bold text-center text-gray-800 mb-1">{tl("selectLang", language)}</h2>
        <p className="text-gray-400 text-sm text-center mb-6">Choose your language / अपनी भाषा चुनें</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setLanguage(l.code as Language)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${language === l.code ? "border-green-500 bg-green-50" : "border-gray-100 bg-gray-50"}`}>
              <p className={`font-semibold text-sm mt-1 ${language === l.code ? "text-green-700" : "text-gray-700"}`}>
                {l.native}
              </p>
            </button>
          ))}
        </div>
        <button onClick={() => setStep("phone")}
          className="w-full bg-green-600 text-white font-semibold rounded-xl py-4 text-lg">
          {tl("continue", language)}
        </button>
      </div>
    </div>
  );

  // ── RENDER PHONE STEP ───────────────────────────────────────
  if (step === "phone") return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex flex-col">
      <div className="flex flex-col items-center pt-12 pb-6">
        <div className="text-5xl mb-3">📱</div>
        <h1 className="text-white text-2xl font-bold">{tl("phoneTitle", language)}</h1>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl p-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <div className="flex gap-2 mb-2">
          <div className="bg-gray-100 rounded-xl px-4 py-3 text-gray-600 font-medium">+91</div>
          <input type="tel" value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
            placeholder="98765 43210"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-lg focus:outline-none focus:border-green-500"
            onKeyDown={e => e.key==="Enter" && sendOtp()} />
        </div>
        <p className="text-gray-400 text-xs mb-6">Enter 10-digit mobile number</p>
        <div id="recap-container" />
        <button onClick={sendOtp} disabled={loading || phone.length < 10}
          className="w-full bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 mb-3">
          {loading ? tl("loading", language) : tl("sendOtp", language)}
        </button>
        <button onClick={() => setStep("language")} className="w-full text-gray-400 text-sm py-2">← Back</button>
      </div>
    </div>
  );

  // ── RENDER OTP STEP ─────────────────────────────────────────
  if (step === "otp") return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex flex-col">
      <div className="flex flex-col items-center pt-12 pb-6">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-white text-2xl font-bold">{tl("otpLabel", language)}</h1>
        <p className="text-green-200 text-sm mt-1">Sent to +91{phone}</p>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl p-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <input type="number" value={otp}
          onChange={e => setOtp(e.target.value.slice(0,6))}
          placeholder="• • • • • •"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-800 text-3xl text-center tracking-[0.5em] focus:outline-none focus:border-green-500 mb-6"
          onKeyDown={e => e.key==="Enter" && otp.length===6 && verifyOtp()} />
        <button onClick={verifyOtp} disabled={loading || otp.length !== 6}
          className="w-full bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 mb-3">
          {loading ? tl("loading", language) : tl("verify", language)}
        </button>
        <button onClick={sendOtp} disabled={countdown > 0 || loading}
          className="w-full text-green-600 disabled:text-gray-400 text-sm py-2">
          {countdown > 0 ? `${tl("resend", language)} (${countdown}s)` : tl("resend", language)}
        </button>
      </div>
    </div>
  );

  // ── RENDER PROFILE STEP ─────────────────────────────────────
  if (step === "profile") return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex flex-col">
      <div className="flex flex-col items-center pt-10 pb-4">
        <div className="text-5xl mb-3">👨‍🌾</div>
        <h1 className="text-white text-2xl font-bold">Your Profile</h1>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl p-6 overflow-y-auto">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <div className="space-y-4">
          {[
            { key:"fullName", label:tl("fullName",language), ph:"Ramesh Patil", req:true },
            { key:"village",  label:tl("village", language), ph:"Nashik",        req:false },
            { key:"district", label:tl("district",language), ph:"Nashik",        req:false },
            { key:"state",    label:tl("state",   language), ph:"Maharashtra",   req:false },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-700 text-sm font-medium block mb-1">
                {f.label} {f.req && <span className="text-red-500">*</span>}
              </label>
              <input type="text"
                value={profile[f.key as keyof typeof profile]}
                onChange={e => setProfile(p => ({...p, [f.key]: e.target.value}))}
                placeholder={f.ph}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-green-500" />
            </div>
          ))}
          <div>
            <label className="text-gray-700 text-sm font-medium block mb-1">Phone</label>
            <input type="text" value={`+91 ${phone}`} disabled
              className="w-full border border-gray-100 bg-gray-100 rounded-xl px-4 py-3 text-gray-400" />
          </div>
        </div>
        <button onClick={saveProfile} disabled={loading || !profile.fullName.trim()}
          className="w-full bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 mt-6">
          {loading ? tl("loading",language) : tl("saveProfile",language)}
        </button>
      </div>
    </div>
  );

  // ── RENDER SETUP STEP ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex flex-col">
      <div className="flex flex-col items-center pt-10 pb-4">
        <div className="text-5xl mb-3">📡</div>
        <h1 className="text-white text-2xl font-bold">Connect Hardware</h1>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl p-6 overflow-y-auto">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-amber-800 text-xs">📦 Device ID: on sticker on hardware box<br/>
          📱 Hardware SIM: SIM card number inside device</p>
        </div>
        <div className="space-y-4">
          {[
            { key:"deviceId",    label:tl("deviceId",  language), ph:"farm_001",        req:true  },
            { key:"hardwareSim", label:tl("simNum",    language), ph:"+919876543210",   req:false },
            { key:"tank",        label:tl("tankLitres",language), ph:"2000",            req:false },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-700 text-sm font-medium block mb-1">
                {f.label} {f.req && <span className="text-red-500">*</span>}
              </label>
              <input type="text"
                value={setup[f.key as keyof typeof setup]}
                onChange={e => setSetup(p => ({...p, [f.key]: e.target.value}))}
                placeholder={f.ph}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-mono focus:outline-none focus:border-green-500" />
            </div>
          ))}
        </div>
        <button onClick={connectDevice} disabled={loading || !setup.deviceId.trim()}
          className="w-full bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-xl py-4 mt-6">
          {loading ? tl("loading",language) : tl("connect",language)}
        </button>
        <button onClick={onLoginSuccess} className="w-full text-gray-400 text-sm py-3 mt-2">
          {tl("skip",language)}
        </button>
      </div>
    </div>
  );
}