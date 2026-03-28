"use client";
// context/LanguageContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// THIS is why language only changed one page before — the context wasn't
// wrapping the whole app. Add this to layout.tsx and every page gets language.
// Supported: English, Hindi, Marathi, Punjabi, Telugu, Tamil
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "hi" | "mr" | "pa" | "te" | "ta";

// ── All UI strings in every language ─────────────────────────────────────────
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    home: "Home", valves: "Valves", temperature: "Temperature",
    battery: "Battery", water: "Water Usage", chat: "Assistant",
    profile: "Profile", settings: "Settings", logout: "Logout",
    // Login
    loginTitle: "Smart Farm Login",
    loginSubtitle: "Enter your phone number to receive OTP",
    phoneLabel: "Phone Number",
    phonePlaceholder: "+91 98765 43210",
    sendOtp: "Send OTP",
    otpLabel: "Enter OTP",
    otpPlaceholder: "6-digit code",
    verifyOtp: "Verify & Login",
    resendOtp: "Resend OTP",
    // Profile
    profileTitle: "My Profile",
    fullName: "Full Name",
    address: "Farm Address",
    village: "Village / Town",
    district: "District",
    state: "State",
    saveProfile: "Save Profile",
    // Setup
    setupTitle: "Connect Your Hardware",
    setupSubtitle: "Link your Smart Farm device to this app",
    deviceId: "Device ID",
    deviceIdHint: "Found on sticker on your hardware box",
    hardwareSim: "Hardware SIM Number",
    hardwareSimHint: "The SIM card number inserted in your device",
    tankCapacity: "Water Tank Capacity (Litres)",
    connectDevice: "Connect Device",
    // Dashboard
    welcomeBack: "Welcome back",
    allSystemsNormal: "All systems normal",
    valveOpen: "Open", valveClosed: "Closed",
    currentTemp: "Current Temperature",
    humidity: "Humidity",
    batteryLevel: "Battery Level",
    batteryHealth: "Battery Health",
    chargeCycles: "Charge Cycles",
    todayUsage: "Today's Water Usage",
    tankRatio: "Tank Used",
    getLocation: "Get Device Location",
    locating: "Locating...",
    // Chatbot
    chatPlaceholder: "Ask about your farm...",
    chatSend: "Send",
    chatSuggestions: "Quick Questions",
    // Common
    loading: "Loading...", save: "Save", cancel: "Cancel",
    error: "Error", success: "Success", back: "Back",
    language: "Language", selectLanguage: "Select Language",
  },
  hi: {
    home: "होम", valves: "वाल्व", temperature: "तापमान",
    battery: "बैटरी", water: "पानी का उपयोग", chat: "सहायक",
    profile: "प्रोफ़ाइल", settings: "सेटिंग्स", logout: "लॉगआउट",
    loginTitle: "स्मार्ट फार्म लॉगिन",
    loginSubtitle: "OTP प्राप्त करने के लिए अपना फोन नंबर दर्ज करें",
    phoneLabel: "फोन नंबर", phonePlaceholder: "+91 98765 43210",
    sendOtp: "OTP भेजें", otpLabel: "OTP दर्ज करें",
    otpPlaceholder: "6 अंकों का कोड", verifyOtp: "सत्यापित करें और लॉगिन करें",
    resendOtp: "OTP फिर भेजें",
    profileTitle: "मेरी प्रोफ़ाइल", fullName: "पूरा नाम",
    address: "खेत का पता", village: "गाँव / शहर",
    district: "जिला", state: "राज्य", saveProfile: "प्रोफ़ाइल सहेजें",
    setupTitle: "हार्डवेयर कनेक्ट करें",
    setupSubtitle: "अपने स्मार्ट फार्म डिवाइस को इस ऐप से जोड़ें",
    deviceId: "डिवाइस ID", deviceIdHint: "आपके हार्डवेयर बॉक्स के स्टीकर पर",
    hardwareSim: "हार्डवेयर SIM नंबर",
    hardwareSimHint: "आपके डिवाइस में लगा SIM कार्ड नंबर",
    tankCapacity: "पानी की टंकी की क्षमता (लीटर)",
    connectDevice: "डिवाइस कनेक्ट करें",
    welcomeBack: "वापस स्वागत है", allSystemsNormal: "सभी सिस्टम सामान्य",
    valveOpen: "खुला", valveClosed: "बंद",
    currentTemp: "वर्तमान तापमान", humidity: "नमी",
    batteryLevel: "बैटरी स्तर", batteryHealth: "बैटरी स्वास्थ्य",
    chargeCycles: "चार्ज चक्र", todayUsage: "आज का पानी उपयोग",
    tankRatio: "टंकी उपयोग", getLocation: "डिवाइस स्थान प्राप्त करें",
    locating: "स्थान ढूंढ रहे हैं...",
    chatPlaceholder: "अपने खेत के बारे में पूछें...",
    chatSend: "भेजें", chatSuggestions: "त्वरित प्रश्न",
    loading: "लोड हो रहा है...", save: "सहेजें", cancel: "रद्द करें",
    error: "त्रुटि", success: "सफलता", back: "वापस",
    language: "भाषा", selectLanguage: "भाषा चुनें",
  },
  mr: {
    home: "मुख्यपृष्ठ", valves: "झडपा", temperature: "तापमान",
    battery: "बॅटरी", water: "पाणी वापर", chat: "सहाय्यक",
    profile: "प्रोफाइल", settings: "सेटिंग्ज", logout: "लॉगआउट",
    loginTitle: "स्मार्ट फार्म लॉगिन",
    loginSubtitle: "OTP मिळवण्यासाठी फोन नंबर टाका",
    phoneLabel: "फोन नंबर", phonePlaceholder: "+91 98765 43210",
    sendOtp: "OTP पाठवा", otpLabel: "OTP टाका",
    otpPlaceholder: "6 अंकी कोड", verifyOtp: "सत्यापित करा आणि लॉगिन करा",
    resendOtp: "OTP पुन्हा पाठवा",
    profileTitle: "माझी प्रोफाइल", fullName: "पूर्ण नाव",
    address: "शेताचा पत्ता", village: "गाव / शहर",
    district: "जिल्हा", state: "राज्य", saveProfile: "प्रोफाइल जतन करा",
    setupTitle: "हार्डवेअर जोडा",
    setupSubtitle: "तुमचे स्मार्ट फार्म डिव्हाइस या अॅपशी जोडा",
    deviceId: "डिव्हाइस ID", deviceIdHint: "हार्डवेअर बॉक्सवरील स्टिकरवर",
    hardwareSim: "हार्डवेअर SIM नंबर",
    hardwareSimHint: "डिव्हाइसमधील SIM कार्ड नंबर",
    tankCapacity: "पाण्याच्या टाकीची क्षमता (लिटर)",
    connectDevice: "डिव्हाइस जोडा",
    welcomeBack: "पुन्हा स्वागत", allSystemsNormal: "सर्व प्रणाली सामान्य",
    valveOpen: "उघडे", valveClosed: "बंद",
    currentTemp: "सध्याचे तापमान", humidity: "आर्द्रता",
    batteryLevel: "बॅटरी पातळी", batteryHealth: "बॅटरी आरोग्य",
    chargeCycles: "चार्ज चक्र", todayUsage: "आजचा पाणी वापर",
    tankRatio: "टाकी वापर", getLocation: "डिव्हाइस स्थान मिळवा",
    locating: "स्थान शोधत आहे...",
    chatPlaceholder: "तुमच्या शेताबद्दल विचारा...",
    chatSend: "पाठवा", chatSuggestions: "त्वरित प्रश्न",
    loading: "लोड होत आहे...", save: "जतन करा", cancel: "रद्द करा",
    error: "त्रुटी", success: "यश", back: "मागे",
    language: "भाषा", selectLanguage: "भाषा निवडा",
  },
  pa: {
    home: "ਮੁੱਖ ਪੰਨਾ", valves: "ਵਾਲਵ", temperature: "ਤਾਪਮਾਨ",
    battery: "ਬੈਟਰੀ", water: "ਪਾਣੀ ਦੀ ਵਰਤੋਂ", chat: "ਸਹਾਇਕ",
    profile: "ਪ੍ਰੋਫਾਈਲ", settings: "ਸੈਟਿੰਗਾਂ", logout: "ਲੌਗਆਉਟ",
    loginTitle: "ਸਮਾਰਟ ਫਾਰਮ ਲੌਗਿਨ",
    loginSubtitle: "OTP ਪ੍ਰਾਪਤ ਕਰਨ ਲਈ ਫ਼ੋਨ ਨੰਬਰ ਦਾਖਲ ਕਰੋ",
    phoneLabel: "ਫ਼ੋਨ ਨੰਬਰ", phonePlaceholder: "+91 98765 43210",
    sendOtp: "OTP ਭੇਜੋ", otpLabel: "OTP ਦਾਖਲ ਕਰੋ",
    otpPlaceholder: "6-ਅੰਕੀ ਕੋਡ", verifyOtp: "ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਲੌਗਿਨ ਕਰੋ",
    resendOtp: "OTP ਦੁਬਾਰਾ ਭੇਜੋ",
    profileTitle: "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ", fullName: "ਪੂਰਾ ਨਾਮ",
    address: "ਖੇਤ ਦਾ ਪਤਾ", village: "ਪਿੰਡ / ਸ਼ਹਿਰ",
    district: "ਜ਼ਿਲ੍ਹਾ", state: "ਸੂਬਾ", saveProfile: "ਪ੍ਰੋਫਾਈਲ ਸੇਵ ਕਰੋ",
    setupTitle: "ਹਾਰਡਵੇਅਰ ਕਨੈਕਟ ਕਰੋ",
    setupSubtitle: "ਆਪਣੇ ਸਮਾਰਟ ਫਾਰਮ ਡਿਵਾਈਸ ਨੂੰ ਇਸ ਐਪ ਨਾਲ ਜੋੜੋ",
    deviceId: "ਡਿਵਾਈਸ ID", deviceIdHint: "ਹਾਰਡਵੇਅਰ ਬਾਕਸ 'ਤੇ ਸਟਿੱਕਰ ਉੱਤੇ",
    hardwareSim: "ਹਾਰਡਵੇਅਰ SIM ਨੰਬਰ",
    hardwareSimHint: "ਡਿਵਾਈਸ ਵਿੱਚ ਲੱਗੇ SIM ਕਾਰਡ ਦਾ ਨੰਬਰ",
    tankCapacity: "ਪਾਣੀ ਦੀ ਟੈਂਕੀ ਦੀ ਸਮਰੱਥਾ (ਲੀਟਰ)",
    connectDevice: "ਡਿਵਾਈਸ ਕਨੈਕਟ ਕਰੋ",
    welcomeBack: "ਵਾਪਸ ਜੀ ਆਇਆਂ", allSystemsNormal: "ਸਾਰੇ ਸਿਸਟਮ ਸਧਾਰਨ",
    valveOpen: "ਖੁੱਲ੍ਹਾ", valveClosed: "ਬੰਦ",
    currentTemp: "ਮੌਜੂਦਾ ਤਾਪਮਾਨ", humidity: "ਨਮੀ",
    batteryLevel: "ਬੈਟਰੀ ਪੱਧਰ", batteryHealth: "ਬੈਟਰੀ ਸਿਹਤ",
    chargeCycles: "ਚਾਰਜ ਚੱਕਰ", todayUsage: "ਅੱਜ ਦੀ ਪਾਣੀ ਵਰਤੋਂ",
    tankRatio: "ਟੈਂਕੀ ਵਰਤੋਂ", getLocation: "ਡਿਵਾਈਸ ਸਥਾਨ ਲਓ",
    locating: "ਸਥਾਨ ਲੱਭ ਰਿਹਾ ਹੈ...",
    chatPlaceholder: "ਆਪਣੇ ਖੇਤ ਬਾਰੇ ਪੁੱਛੋ...",
    chatSend: "ਭੇਜੋ", chatSuggestions: "ਤੇਜ਼ ਸਵਾਲ",
    loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...", save: "ਸੇਵ ਕਰੋ", cancel: "ਰੱਦ ਕਰੋ",
    error: "ਗਲਤੀ", success: "ਸਫਲਤਾ", back: "ਵਾਪਸ",
    language: "ਭਾਸ਼ਾ", selectLanguage: "ਭਾਸ਼ਾ ਚੁਣੋ",
  },
  te: {
    home: "హోమ్", valves: "వాల్వులు", temperature: "ఉష్ణోగ్రత",
    battery: "బ్యాటరీ", water: "నీటి వినియోగం", chat: "సహాయకుడు",
    profile: "ప్రొఫైల్", settings: "సెట్టింగులు", logout: "లాగ్అవుట్",
    loginTitle: "స్మార్ట్ ఫార్మ్ లాగిన్",
    loginSubtitle: "OTP పొందడానికి మీ ఫోన్ నంబర్ నమోదు చేయండి",
    phoneLabel: "ఫోన్ నంబర్", phonePlaceholder: "+91 98765 43210",
    sendOtp: "OTP పంపండి", otpLabel: "OTP నమోదు చేయండి",
    otpPlaceholder: "6 అంకెల కోడ్", verifyOtp: "ధృవీకరించి లాగిన్ అవ్వండి",
    resendOtp: "OTP మళ్ళీ పంపండి",
    profileTitle: "నా ప్రొఫైల్", fullName: "పూర్తి పేరు",
    address: "పొలం చిరునామా", village: "గ్రామం / పట్టణం",
    district: "జిల్లా", state: "రాష్ట్రం", saveProfile: "ప్రొఫైల్ సేవ్ చేయండి",
    setupTitle: "హార్డ్‌వేర్ కనెక్ట్ చేయండి",
    setupSubtitle: "మీ స్మార్ట్ ఫార్మ్ పరికరాన్ని యాప్‌కి లింక్ చేయండి",
    deviceId: "పరికర ID", deviceIdHint: "హార్డ్‌వేర్ బాక్స్‌పై స్టిక్కర్‌లో ఉంది",
    hardwareSim: "హార్డ్‌వేర్ SIM నంబర్",
    hardwareSimHint: "పరికరంలో అమర్చిన SIM కార్డ్ నంబర్",
    tankCapacity: "నీటి ట్యాంక్ సామర్థ్యం (లీటర్లు)",
    connectDevice: "పరికరం కనెక్ట్ చేయండి",
    welcomeBack: "తిరిగి స్వాగతం", allSystemsNormal: "అన్ని వ్యవస్థలు సాధారణంగా ఉన్నాయి",
    valveOpen: "తెరిచి", valveClosed: "మూసివేసి",
    currentTemp: "ప్రస్తుత ఉష్ణోగ్రత", humidity: "తేమ",
    batteryLevel: "బ్యాటరీ స్థాయి", batteryHealth: "బ్యాటరీ ఆరోగ్యం",
    chargeCycles: "ఛార్జ్ చక్రాలు", todayUsage: "నేటి నీటి వినియోగం",
    tankRatio: "ట్యాంక్ వినియోగం", getLocation: "పరికర స్థానం పొందండి",
    locating: "స్థానం గుర్తిస్తోంది...",
    chatPlaceholder: "మీ పొలం గురించి అడగండి...",
    chatSend: "పంపండి", chatSuggestions: "త్వరిత ప్రశ్నలు",
    loading: "లోడ్ అవుతోంది...", save: "సేవ్ చేయండి", cancel: "రద్దు చేయండి",
    error: "లోపం", success: "విజయం", back: "వెనుకకు",
    language: "భాష", selectLanguage: "భాష ఎంచుకోండి",
  },
  ta: {
    home: "முகப்பு", valves: "வால்வுகள்", temperature: "வெப்பநிலை",
    battery: "பேட்டரி", water: "நீர் பயன்பாடு", chat: "உதவியாளர்",
    profile: "சுயவிவரம்", settings: "அமைப்புகள்", logout: "வெளியேறு",
    loginTitle: "ஸ்மார்ட் ஃபார்ம் உள்நுழைவு",
    loginSubtitle: "OTP பெற உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்",
    phoneLabel: "தொலைபேசி எண்", phonePlaceholder: "+91 98765 43210",
    sendOtp: "OTP அனுப்பு", otpLabel: "OTP உள்ளிடவும்",
    otpPlaceholder: "6 இலக்க குறியீடு", verifyOtp: "சரிபார்த்து உள்நுழைக",
    resendOtp: "OTP மீண்டும் அனுப்பு",
    profileTitle: "என் சுயவிவரம்", fullName: "முழு பெயர்",
    address: "பண்ணை முகவரி", village: "கிராமம் / நகரம்",
    district: "மாவட்டம்", state: "மாநிலம்", saveProfile: "சுயவிவரம் சேமி",
    setupTitle: "வன்பொருளை இணைக்கவும்",
    setupSubtitle: "உங்கள் ஸ்மார்ட் ஃபார்ம் சாதனத்தை இந்த ஆப்புடன் இணைக்கவும்",
    deviceId: "சாதன ID", deviceIdHint: "வன்பொருள் பெட்டியில் உள்ள ஸ்டிக்கரில் உள்ளது",
    hardwareSim: "வன்பொருள் SIM எண்",
    hardwareSimHint: "சாதனத்தில் உள்ள SIM கார்டு எண்",
    tankCapacity: "தண்ணீர் தொட்டி கொள்ளளவு (லிட்டர்)",
    connectDevice: "சாதனத்தை இணைக்கவும்",
    welcomeBack: "மீண்டும் வரவேற்கிறோம்", allSystemsNormal: "அனைத்து அமைப்புகளும் சரியாக உள்ளன",
    valveOpen: "திறந்த", valveClosed: "மூடிய",
    currentTemp: "தற்போதைய வெப்பநிலை", humidity: "ஈரப்பதம்",
    batteryLevel: "பேட்டரி நிலை", batteryHealth: "பேட்டரி ஆரோக்கியம்",
    chargeCycles: "சார்ஜ் சுழற்சிகள்", todayUsage: "இன்றைய நீர் பயன்பாடு",
    tankRatio: "தொட்டி பயன்பாடு", getLocation: "சாதன இருப்பிடம் பெறுக",
    locating: "இருப்பிடம் கண்டறிகிறது...",
    chatPlaceholder: "உங்கள் பண்ணையைப் பற்றி கேளுங்கள்...",
    chatSend: "அனுப்பு", chatSuggestions: "விரைவு கேள்விகள்",
    loading: "ஏற்றுகிறது...", save: "சேமி", cancel: "ரத்து செய்",
    error: "பிழை", success: "வெற்றி", back: "பின்செல்",
    language: "மொழி", selectLanguage: "மொழியை தேர்ந்தெடுக்கவும்",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem("sf_language") as Language | null;
    if (saved && translations[saved]) setLanguageState(saved);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("sf_language", lang);
  };

  // t() is the translation function — use t("home") anywhere in the app
  const t = (key: string): string =>
    translations[language]?.[key] ?? translations.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
