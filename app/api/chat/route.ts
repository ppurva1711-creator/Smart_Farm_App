// app/api/chat/route.ts — Rule-based + Groq fallback
import { NextRequest, NextResponse } from "next/server";

const RESPONSES: Record<string, Record<string, string>> = {
  valve_count: {
    en: "Currently OPEN_COUNT valve(s) are OPEN: OPEN_LIST. CLOSED_COUNT valve(s) are CLOSED: CLOSED_LIST.",
    hi: "अभी OPEN_COUNT वाल्व खुले हैं: OPEN_LIST. CLOSED_COUNT वाल्व बंद हैं: CLOSED_LIST.",
    mr: "सध्या OPEN_COUNT झडपा उघड्या: OPEN_LIST. CLOSED_COUNT बंद: CLOSED_LIST.",
    pa: "ਹੁਣ OPEN_COUNT ਵਾਲਵ ਖੁੱਲ੍ਹੇ: OPEN_LIST. CLOSED_COUNT ਬੰਦ: CLOSED_LIST.",
    te: "ప్రస్తుతం OPEN_COUNT వాల్వులు తెరిచి: OPEN_LIST. CLOSED_COUNT మూసివున్నాయి: CLOSED_LIST.",
    ta: "தற்போது OPEN_COUNT வால்வுகள் திறந்த: OPEN_LIST. CLOSED_COUNT மூடப்பட்ட: CLOSED_LIST.",
  },
  temp_normal: {
    en: "Temperature is TEMP°C — safe for most crops. Good conditions.", hi: "तापमान TEMP°C है — फसलों के लिए सुरक्षित।",
    mr: "तापमान TEMP°C — पिकांसाठी सुरक्षित.", pa: "ਤਾਪਮਾਨ TEMP°C — ਫਸਲਾਂ ਲਈ ਸੁਰੱਖਿਅਤ.",
    te: "ఉష్ణోగ్రత TEMP°C — పంటలకు సురక్షితం.", ta: "வெப்பநிலை TEMP°C — பயிர்களுக்கு பாதுகாப்பானது.",
  },
  temp_high: {
    en: "⚠️ Temperature is HIGH at TEMP°C! Water crops early morning or after 5 PM. Avoid midday irrigation.",
    hi: "⚠️ तापमान TEMP°C — अधिक! सुबह जल्दी या शाम 5 बजे बाद पानी दें।",
    mr: "⚠️ तापमान TEMP°C — जास्त! सकाळी लवकर किंवा संध्याकाळी पाणी द्या.",
    pa: "⚠️ ਤਾਪਮਾਨ TEMP°C — ਜ਼ਿਆਦਾ! ਸਵੇਰੇ ਜਾਂ ਸ਼ਾਮ ਨੂੰ ਪਾਣੀ ਦਿਓ.",
    te: "⚠️ ఉష్ణోగ్రత TEMP°C — ఎక్కువ! తెల్లవారుజామున లేదా సాయంత్రం నీరు పెట్టండి.",
    ta: "⚠️ வெப்பநிலை TEMP°C — அதிகம்! காலை அல்லது மாலையில் பாய்ச்சுங்கள்.",
  },
  temp_low: {
    en: "🌡️ Temperature is LOW at TEMP°C. Protect sensitive crops from cold tonight.",
    hi: "🌡️ तापमान TEMP°C — कम। ठंडी रात के लिए फसलों को बचाएं.",
    mr: "🌡️ तापमान TEMP°C — कमी. थंडीपासून पिकांना वाचवा.", pa: "🌡️ ਤਾਪਮਾਨ TEMP°C — ਘੱਟ. ਫਸਲਾਂ ਨੂੰ ਠੰਡ ਤੋਂ ਬਚਾਓ.",
    te: "🌡️ ఉష్ణోగ్రత TEMP°C — తక్కువ. చలి నుండి పంటలను రక్షించండి.", ta: "🌡️ வெப்பநிலை TEMP°C — குறைவு. குளிரிலிருந்து பாதுகாக்கவும்.",
  },
  water: {
    en: "💧 Today: USED L used of TOTAL L capacity (PERCENT% of tank). ADVICE",
    hi: "💧 आज: TOTAL L में से USED L उपयोग (PERCENT%). ADVICE",
    mr: "💧 आज: TOTAL L पैकी USED L वापर (PERCENT%). ADVICE",
    pa: "💧 ਅੱਜ: TOTAL L ਵਿੱਚੋਂ USED L ਵਰਤੋਂ (PERCENT%). ADVICE",
    te: "💧 నేడు: TOTAL Lలో USED L వాడారు (PERCENT%). ADVICE",
    ta: "💧 இன்று: TOTAL Lலில் USED L பயன்படுத்தப்பட்டது (PERCENT%). ADVICE",
  },
  battery_ok: {
    en: "🔋 Battery at PERCENT% (VOLTAGE V) — Good. CYCLES charge cycles completed.",
    hi: "🔋 बैटरी PERCENT% (VOLTAGE V) — अच्छी. CYCLES चार्ज चक्र.", mr: "🔋 बॅटरी PERCENT% (VOLTAGE V) — चांगली. CYCLES चक्र.",
    pa: "🔋 ਬੈਟਰੀ PERCENT% (VOLTAGE V) — ਚੰਗੀ. CYCLES ਚੱਕਰ.", te: "🔋 బ్యాటరీ PERCENT% (VOLTAGE V) — మంచిది. CYCLES చక్రాలు.",
    ta: "🔋 பேட்டரி PERCENT% (VOLTAGE V) — நல்லது. CYCLES சுழற்சிகள்.",
  },
  battery_low: {
    en: "⚠️ Battery LOW at PERCENT% (VOLTAGE V)! Charge immediately. CYCLES cycles done.",
    hi: "⚠️ बैटरी कम PERCENT% (VOLTAGE V)! अभी चार्ज करें.", mr: "⚠️ बॅटरी कमी PERCENT% (VOLTAGE V)! आत्ताच चार्ज करा.",
    pa: "⚠️ ਬੈਟਰੀ ਘੱਟ PERCENT% (VOLTAGE V)! ਹੁਣੇ ਚਾਰਜ ਕਰੋ.", te: "⚠️ బ్యాటరీ తక్కువ PERCENT% (VOLTAGE V)! వెంటనే చార్జ్ చేయండి.",
    ta: "⚠️ பேட்டரி குறைவு PERCENT% (VOLTAGE V)! உடனே சார்ஜ் செய்யுங்கள்.",
  },
  should_water: {
    en: "ADVICE", hi: "ADVICE", mr: "ADVICE", pa: "ADVICE", te: "ADVICE", ta: "ADVICE",
  },
  off_topic: {
    en: "I can only help with farm topics: valves, temperature, water usage, and battery. 🌾",
    hi: "मैं केवल खेत विषयों में मदद कर सकता हूं: वाल्व, तापमान, पानी, बैटरी। 🌾",
    mr: "मी फक्त शेती विषयांमध्ये मदत करतो: झडपा, तापमान, पाणी, बॅटरी. 🌾",
    pa: "ਮੈਂ ਸਿਰਫ਼ ਖੇਤ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹਾਂ: ਵਾਲਵ, ਤਾਪਮਾਨ, ਪਾਣੀ, ਬੈਟਰੀ. 🌾",
    te: "నేను వ్యవసాయ అంశాలలో మాత్రమే సహాయం చేస్తాను: వాల్వులు, ఉష్ణోగ్రత, నీరు, బ్యాటరీ. 🌾",
    ta: "நான் பண்ணை தலைப்புகளில் மட்டுமே உதவுகிறேன்: வால்வுகள், வெப்பநிலை, நீர், பேட்டரி. 🌾",
  },
  no_data: {
    en: "No sensor data yet. Make sure your hardware is powered on and connected.",
    hi: "अभी कोई डेटा नहीं। हार्डवेयर चालू और कनेक्टेड है?",
    mr: "अजून डेटा नाही. हार्डवेअर चालू आणि कनेक्ट आहे का?",
    pa: "ਹੁਣੇ ਕੋਈ ਡੇਟਾ ਨਹੀਂ। ਹਾਰਡਵੇਅਰ ਚਾਲੂ ਹੈ?",
    te: "ఇంకా డేటా లేదు. హార్డ్‌వేర్ ఆన్ అయి ఉందా?",
    ta: "இன்னும் தரவு இல்லை. வன்பொருள் இயங்குகிறதா?",
  },
};

function detect(msg: string): string {
  const m = msg.toLowerCase();
  if (m.match(/valve|वाल्व|झडप|ਵਾਲਵ|వాల్వ్|வால்வ|open|close|on|off|खुल|बंद/)) {
    if (m.match(/how many|count|कितन|किती|ਕਿੰਨ|ఎన్ని|எத்தன/)) return "valve_count";
    return "valve_count";
  }
  if (m.match(/temp|तापमान|ਤਾਪਮਾਨ|ఉష్ణ|வெப்|weather|hot|cold/)) return "temperature";
  if (m.match(/water|पानी|पाणी|ਪਾਣੀ|నీరు|நீர்|usage|tank|litre/)) {
    if (m.match(/should|now|अभी|आत्ता|ਹੁਣ|ఇప్పుడు|இப்போது|when/)) return "should_water";
    return "water";
  }
  if (m.match(/battery|बैटरी|बॅटरी|ਬੈਟਰੀ|బ్యాటరీ|பேட்டரி|power|charge/)) return "battery";
  return "off_topic";
}

export async function POST(req: NextRequest) {
  const { deviceId, message, language = "en" } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status:400 });

  const intent = detect(message);
  const lang   = language as string;

  // Fetch Firebase data
  let sensors: Record<string, number> = {};
  let valves:  Record<string, Record<string, unknown>> = {};
  let water:   Record<string, number> = {};
  let cycleCount = 0;

  if (deviceId) {
    try {
      const { getAdminDb } = await import("../../../lib/firebase-admin");
      const db = getAdminDb();
      const today = new Date().toISOString().slice(0,10);
      const [s, v, w, c] = await Promise.all([
        db.ref(`devices/${deviceId}/sensors`).once("value"),
        db.ref(`devices/${deviceId}/valves`).once("value"),
        db.ref(`devices/${deviceId}/waterUsage/daily/${today}`).once("value"),
        db.ref(`devices/${deviceId}/battery/cycles`).once("value"),
      ]);
      sensors    = s.val() ?? {};
      valves     = v.val() ?? {};
      water      = w.val() ?? {};
      cycleCount = Object.keys(c.val() ?? {}).length;
    } catch { /* continue without data */ }
  }

  let reply = "";
  const temp    = sensors.temperature;
  const bat     = sensors.battery ?? 0;
  const batV    = sensors.batteryVoltage ?? 0;
  const used    = water.totalLitres ?? 0;
  const total   = water.tankCapacityLitres ?? 2000;
  const percent = water.ratioPercent ?? 0;

  if (intent === "valve_count") {
    const open   = Object.entries(valves).filter(([,v]) => v.desiredState).map(([id]) => id);
    const closed = Object.entries(valves).filter(([,v]) => !v.desiredState).map(([id]) => id);
    if (!Object.keys(valves).length) {
      reply = RESPONSES.no_data[lang] ?? RESPONSES.no_data.en;
    } else {
      reply = (RESPONSES.valve_count[lang] ?? RESPONSES.valve_count.en)
        .replace("OPEN_COUNT", String(open.length))
        .replace("OPEN_LIST",  open.length  ? open.join(", ")  : "none")
        .replace("CLOSED_COUNT", String(closed.length))
        .replace("CLOSED_LIST",  closed.length ? closed.join(", ") : "none");
    }
  } else if (intent === "temperature") {
    if (temp == null) { reply = RESPONSES.no_data[lang] ?? RESPONSES.no_data.en; }
    else if (temp > 35) reply = (RESPONSES.temp_high[lang] ?? RESPONSES.temp_high.en).replace(/TEMP/g, String(temp));
    else if (temp < 15) reply = (RESPONSES.temp_low[lang]  ?? RESPONSES.temp_low.en).replace(/TEMP/g, String(temp));
    else                reply = (RESPONSES.temp_normal[lang]?? RESPONSES.temp_normal.en).replace(/TEMP/g, String(temp));
  } else if (intent === "water") {
    const advMap: Record<string,string> = {
      en: percent > 80 ? "⚠️ Tank almost full — reduce watering." : percent < 20 ? "Tank getting low — check source." : "Tank level good.",
      hi: percent > 80 ? "⚠️ टंकी लगभग भरी — पानी कम करें." : percent < 20 ? "टंकी कम हो रही है." : "टंकी ठीक है.",
      mr: percent > 80 ? "⚠️ टाकी जवळजवळ भरली." : percent < 20 ? "टाकी कमी होत आहे." : "टाकी ठीक आहे.",
      pa: percent > 80 ? "⚠️ ਟੈਂਕੀ ਭਰ ਗਈ." : percent < 20 ? "ਟੈਂਕੀ ਘੱਟ ਹੋ ਰਹੀ." : "ਟੈਂਕੀ ਠੀਕ ਹੈ.",
      te: percent > 80 ? "⚠️ ట్యాంక్ నిండింది." : percent < 20 ? "ట్యాంక్ తక్కువ." : "ట్యాంక్ బాగుంది.",
      ta: percent > 80 ? "⚠️ தொட்டி நிரம்பியது." : percent < 20 ? "தொட்டி குறைவு." : "தொட்டி நல்லது.",
    };
    reply = (RESPONSES.water[lang] ?? RESPONSES.water.en)
      .replace("USED", String(used)).replace("TOTAL", String(total))
      .replace("PERCENT", String(percent)).replace("ADVICE", advMap[lang] ?? advMap.en);
  } else if (intent === "should_water") {
    const openCount = Object.values(valves).filter(v => v.desiredState).length;
    const advMap: Record<string,string> = {
      en: temp != null && temp > 35
        ? `It's hot (${temp}°C). Water now but ${openCount > 0 ? "valves already open ✅" : "open valves first"}. Best: early morning or after 5 PM.`
        : `Temperature is ${temp ?? "?"}°C — ${openCount > 0 ? `${openCount} valve(s) already open ✅` : "Open valves to start irrigation."}`,
      hi: `तापमान ${temp ?? "?"}°C — ${openCount > 0 ? `${openCount} वाल्व खुले ✅` : "सिंचाई के लिए वाल्व खोलें।"}`,
      mr: `तापमान ${temp ?? "?"}°C — ${openCount > 0 ? `${openCount} झडपा उघड्या ✅` : "सिंचनासाठी झडपा उघडा."}`,
      pa: `ਤਾਪਮਾਨ ${temp ?? "?"}°C — ${openCount > 0 ? `${openCount} ਵਾਲਵ ਖੁੱਲ੍ਹੇ ✅` : "ਸਿੰਚਾਈ ਲਈ ਵਾਲਵ ਖੋਲ੍ਹੋ."}`,
      te: `ఉష్ణోగ్రత ${temp ?? "?"}°C — ${openCount > 0 ? `${openCount} వాల్వులు తెరిచి ✅` : "నీటి కోసం వాల్వులు తెరవండి."}`,
      ta: `வெப்பநிலை ${temp ?? "?"}°C — ${openCount > 0 ? `${openCount} வால்வுகள் திறந்த ✅` : "நீர்ப்பாசனத்திற்கு வால்வுகள் திறக்கவும்."}`,
    };
    reply = advMap[lang] ?? advMap.en;
  } else if (intent === "battery") {
    const key  = bat < 25 ? "battery_low" : "battery_ok";
    reply = (RESPONSES[key][lang] ?? RESPONSES[key].en)
      .replace(/PERCENT/g, String(bat)).replace(/VOLTAGE/g, String(batV))
      .replace(/CYCLES/g, String(cycleCount));
  } else {
    reply = RESPONSES.off_topic[lang] ?? RESPONSES.off_topic.en;
  }

  return NextResponse.json({ reply });
}