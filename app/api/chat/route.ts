import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// SMART FARM CHATBOT — No API needed, completely free
// Reads actual device state from Firebase and gives smart answers
// Works in all 6 languages
// ─────────────────────────────────────────────────────────────────────────────

// ── All responses in all languages ───────────────────────────────────────────
const RESPONSES: Record<string, Record<string, string>> = {
  // VALVE responses
  valve_all_status: {
    en: "VALVE_STATUS_RESPONSE",
    hi: "VALVE_STATUS_RESPONSE",
    mr: "VALVE_STATUS_RESPONSE",
    pa: "VALVE_STATUS_RESPONSE",
    te: "VALVE_STATUS_RESPONSE",
    ta: "VALVE_STATUS_RESPONSE",
  },
  valve_open_count: {
    en: "Currently OPEN_COUNT valve(s) are open: OPEN_LIST. CLOSED_COUNT valve(s) are closed: CLOSED_LIST.",
    hi: "अभी OPEN_COUNT वाल्व खुले हैं: OPEN_LIST. CLOSED_COUNT वाल्व बंद हैं: CLOSED_LIST.",
    mr: "सध्या OPEN_COUNT झडपा उघड्या आहेत: OPEN_LIST. CLOSED_COUNT झडपा बंद आहेत: CLOSED_LIST.",
    pa: "ਹੁਣ OPEN_COUNT ਵਾਲਵ ਖੁੱਲ੍ਹੇ ਹਨ: OPEN_LIST. CLOSED_COUNT ਵਾਲਵ ਬੰਦ ਹਨ: CLOSED_LIST.",
    te: "ప్రస్తుతం OPEN_COUNT వాల్వులు తెరిచి ఉన్నాయి: OPEN_LIST. CLOSED_COUNT వాల్వులు మూసివున్నాయి: CLOSED_LIST.",
    ta: "தற்போது OPEN_COUNT வால்வுகள் திறந்துள்ளன: OPEN_LIST. CLOSED_COUNT வால்வுகள் மூடப்பட்டுள்ளன: CLOSED_LIST.",
  },

  // TEMPERATURE responses
  temp_normal: {
    en: "Current temperature is TEMP°C — this is normal and safe for most crops. Keep monitoring.",
    hi: "वर्तमान तापमान TEMP°C है — यह अधिकांश फसलों के लिए सामान्य और सुरक्षित है।",
    mr: "सध्याचे तापमान TEMP°C आहे — हे बहुतांश पिकांसाठी सामान्य आणि सुरक्षित आहे.",
    pa: "ਮੌਜੂਦਾ ਤਾਪਮਾਨ TEMP°C ਹੈ — ਇਹ ਜ਼ਿਆਦਾਤਰ ਫਸਲਾਂ ਲਈ ਸਾਧਾਰਨ ਹੈ।",
    te: "ప్రస్తుత ఉష్ణోగ్రత TEMP°C — ఇది చాలా పంటలకు సాధారణంగా ఉంది.",
    ta: "தற்போதைய வெப்பநிலை TEMP°C — இது பெரும்பாலான பயிர்களுக்கு சாதாரணமானது.",
  },
  temp_high: {
    en: "⚠️ Temperature is TEMP°C — this is HIGH. Water your crops early morning or evening. Avoid watering in afternoon heat.",
    hi: "⚠️ तापमान TEMP°C है — यह अधिक है। सुबह जल्दी या शाम को फसल को पानी दें। दोपहर में पानी देने से बचें।",
    mr: "⚠️ तापमान TEMP°C आहे — हे जास्त आहे. सकाळी लवकर किंवा संध्याकाळी पिकांना पाणी द्या.",
    pa: "⚠️ ਤਾਪਮਾਨ TEMP°C ਹੈ — ਇਹ ਜ਼ਿਆਦਾ ਹੈ। ਸਵੇਰੇ ਜਾਂ ਸ਼ਾਮ ਨੂੰ ਫਸਲਾਂ ਨੂੰ ਪਾਣੀ ਦਿਓ।",
    te: "⚠️ ఉష్ణోగ్రత TEMP°C — ఇది ఎక్కువగా ఉంది. తెల్లవారుజామున లేదా సాయంత్రం నీరు పెట్టండి.",
    ta: "⚠️ வெப்பநிலை TEMP°C — இது அதிகமாக உள்ளது. காலை அல்லது மாலையில் பயிர்களுக்கு தண்ணீர் பாய்ச்சுங்கள்.",
  },
  temp_low: {
    en: "🌡️ Temperature is TEMP°C — this is LOW. Protect sensitive crops from cold. Consider covering plants at night.",
    hi: "🌡️ तापमान TEMP°C है — यह कम है। संवेदनशील फसलों को ठंड से बचाएं।",
    mr: "🌡️ तापमान TEMP°C आहे — हे कमी आहे. संवेदनशील पिकांना थंडीपासून वाचवा.",
    pa: "🌡️ ਤਾਪਮਾਨ TEMP°C ਹੈ — ਇਹ ਘੱਟ ਹੈ। ਸੰਵੇਦਨਸ਼ੀਲ ਫਸਲਾਂ ਨੂੰ ਠੰਡ ਤੋਂ ਬਚਾਓ।",
    te: "🌡️ ఉష్ణోగ్రత TEMP°C — ఇది తక్కువగా ఉంది. సున్నితమైన పంటలను చలి నుండి రక్షించండి.",
    ta: "🌡️ வெப்பநிலை TEMP°C — இது குறைவாக உள்ளது. உணர்திறன் பயிர்களை குளிரிலிருந்து பாதுகாக்கவும்.",
  },

  // WATER responses
  water_usage: {
    en: "💧 Today's water usage: USED litres used out of TOTAL litres capacity (PERCENT% of tank). ADVICE",
    hi: "💧 आज का पानी उपयोग: TOTAL लीटर में से USED लीटर उपयोग हुआ (टंकी का PERCENT%). ADVICE",
    mr: "💧 आजचा पाणी वापर: TOTAL लिटरपैकी USED लिटर वापरले (टाकीचे PERCENT%). ADVICE",
    pa: "💧 ਅੱਜ ਦਾ ਪਾਣੀ ਵਰਤੋਂ: TOTAL ਲੀਟਰ ਵਿੱਚੋਂ USED ਲੀਟਰ ਵਰਤਿਆ (ਟੈਂਕੀ ਦਾ PERCENT%). ADVICE",
    te: "💧 నేటి నీటి వినియోగం: TOTAL లీటర్లలో USED లీటర్లు వాడారు (ట్యాంక్‌లో PERCENT%). ADVICE",
    ta: "💧 இன்றைய நீர் பயன்பாடு: TOTAL லிட்டரில் USED லிட்டர் பயன்படுத்தப்பட்டது (தொட்டியின் PERCENT%). ADVICE",
  },

  // BATTERY responses
  battery_good: {
    en: "🔋 Battery is at PERCENT% (VOLTAGE V) — Good level. CYCLES charge cycles completed. Estimated health: HEALTH%.",
    hi: "🔋 बैटरी PERCENT% (VOLTAGE V) पर है — अच्छा स्तर। CYCLES चार्ज चक्र पूरे हुए। अनुमानित स्वास्थ्य: HEALTH%।",
    mr: "🔋 बॅटरी PERCENT% (VOLTAGE V) वर आहे — चांगली पातळी। CYCLES चार्ज चक्र पूर्ण झाले. अंदाजे आरोग्य: HEALTH%.",
    pa: "🔋 ਬੈਟਰੀ PERCENT% (VOLTAGE V) 'ਤੇ ਹੈ — ਚੰਗਾ ਪੱਧਰ। CYCLES ਚਾਰਜ ਚੱਕਰ ਪੂਰੇ ਹੋਏ। ਅਨੁਮਾਨਿਤ ਸਿਹਤ: HEALTH%.",
    te: "🔋 బ్యాటరీ PERCENT% (VOLTAGE V) లో ఉంది — మంచి స్థాయి. CYCLES చార్జ్ చక్రాలు పూర్తయ్యాయి. ఆరోగ్యం: HEALTH%.",
    ta: "🔋 பேட்டரி PERCENT% (VOLTAGE V) இல் உள்ளது — நல்ல நிலை. CYCLES சார்ஜ் சுழற்சிகள் முடிந்தன. ஆரோக்கியம்: HEALTH%.",
  },
  battery_low: {
    en: "⚠️ Battery LOW at PERCENT% (VOLTAGE V)! Please charge soon. CYCLES cycles done. Health: HEALTH%.",
    hi: "⚠️ बैटरी कम है PERCENT% (VOLTAGE V)! जल्द चार्ज करें। CYCLES चक्र हुए। स्वास्थ्य: HEALTH%।",
    mr: "⚠️ बॅटरी कमी आहे PERCENT% (VOLTAGE V)! लवकर चार्ज करा. CYCLES चक्र झाले. आरोग्य: HEALTH%.",
    pa: "⚠️ ਬੈਟਰੀ ਘੱਟ ਹੈ PERCENT% (VOLTAGE V)! ਜਲਦੀ ਚਾਰਜ ਕਰੋ। CYCLES ਚੱਕਰ ਹੋਏ। ਸਿਹਤ: HEALTH%.",
    te: "⚠️ బ్యాటరీ తక్కువగా ఉంది PERCENT% (VOLTAGE V)! త్వరగా చార్జ్ చేయండి. CYCLES చక్రాలు. ఆరోగ్యం: HEALTH%.",
    ta: "⚠️ பேட்டரி குறைவாக உள்ளது PERCENT% (VOLTAGE V)! விரைவில் சார்ஜ் செய்யுங்கள். CYCLES சுழற்சிகள். ஆரோக்கியம்: HEALTH%.",
  },

  // WATERING ADVICE
  should_water: {
    en: "WATER_ADVICE",
    hi: "WATER_ADVICE",
    mr: "WATER_ADVICE",
    pa: "WATER_ADVICE",
    te: "WATER_ADVICE",
    ta: "WATER_ADVICE",
  },

  // OFF TOPIC
  off_topic: {
    en: "I can only help with farm-related topics: valves, temperature, water usage, and battery. Please ask about your farm! 🌾",
    hi: "मैं केवल खेत से संबंधित विषयों में मदद कर सकता हूं: वाल्व, तापमान, पानी उपयोग और बैटरी। कृपया अपने खेत के बारे में पूछें! 🌾",
    mr: "मी फक्त शेतीशी संबंधित विषयांमध्ये मदत करू शकतो: झडपा, तापमान, पाणी वापर आणि बॅटरी. 🌾",
    pa: "ਮੈਂ ਸਿਰਫ਼ ਖੇਤ ਨਾਲ ਸੰਬੰਧਿਤ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ: ਵਾਲਵ, ਤਾਪਮਾਨ, ਪਾਣੀ, ਬੈਟਰੀ। 🌾",
    te: "నేను వ్యవసాయ అంశాలలో మాత్రమే సహాయం చేయగలను: వాల్వులు, ఉష్ణోగ్రత, నీరు, బ్యాటరీ. 🌾",
    ta: "நான் பண்ணை தொடர்பான தலைப்புகளில் மட்டுமே உதவ முடியும்: வால்வுகள், வெப்பநிலை, நீர், பேட்டரி. 🌾",
  },

  // NO DATA
  no_data: {
    en: "No sensor data available yet. Please make sure your hardware device is powered on and connected.",
    hi: "अभी कोई सेंसर डेटा उपलब्ध नहीं है। कृपया सुनिश्चित करें कि आपका हार्डवेयर डिवाइस चालू और कनेक्टेड है।",
    mr: "अजून सेंसर डेटा उपलब्ध नाही. कृपया खात्री करा की तुमचे हार्डवेअर डिव्हाइस चालू आणि कनेक्ट आहे.",
    pa: "ਅਜੇ ਕੋਈ ਸੈਂਸਰ ਡੇਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਯਕੀਨੀ ਕਰੋ ਕਿ ਤੁਹਾਡਾ ਡਿਵਾਈਸ ਚਾਲੂ ਹੈ।",
    te: "ఇంకా సెన్సార్ డేటా అందుబాటులో లేదు. మీ హార్డ్‌వేర్ పరికరం ఆన్ అవి కనెక్ట్ అయిందో తనిఖీ చేయండి.",
    ta: "இன்னும் சென்சார் தரவு இல்லை. உங்கள் வன்பொருள் சாதனம் இயங்குகிறதா என்று சரிபார்க்கவும்.",
  },
};

// ── Keyword matcher ───────────────────────────────────────────────────────────
function detectIntent(msg: string): string {
  const m = msg.toLowerCase();

  // Valve intents
  if (m.match(/valve|वाल्व|झडप|ਵਾਲਵ|వాల్వ|வால்வ|open|close|खुल|बंद|उघड|ਖੁੱਲ੍ਹ|తెరి|திற/)) {
    if (m.match(/how many|count|कितन|किती|ਕਿੰਨ|ఎన్ని|எத்தன/)) return "valve_open_count";
    return "valve_all_status";
  }

  // Temperature intents
  if (m.match(/temp|तापमान|ਤਾਪਮਾਨ|ఉష్ణ|வெப்|weather|मौसम|hot|cold|गर्म|ठंड/)) {
    return "temperature";
  }

  // Water intents
  if (m.match(/water|पानी|पाणी|ਪਾਣੀ|నీరు|நீர்|usage|वापर|litre|tank|टंकी|टाकी|ਟੈਂਕੀ|ట్యాంక్|தொட்டி/)) {
    if (m.match(/should|now|अभी|आत्ता|ਹੁਣ|ఇప్పుడు|இப்போது|when|कब|केव्हा|ਕਦੋਂ/)) return "should_water";
    return "water_usage";
  }

  // Battery intents
  if (m.match(/battery|बैटरी|बॅटरी|ਬੈਟਰੀ|బ్యాటరీ|பேட்டரி|power|charge|health/)) {
    return "battery";
  }

  return "off_topic";
}

export async function POST(req: NextRequest) {
  const { deviceId, message, language = "en" } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const intent = detectIntent(message);
  const lang   = language as string;

  // ── Fetch device data from Firebase ────────────────────────────────────────
  let sensors: Record<string, number>  = {};
  let valves:  Record<string, Record<string, unknown>> = {};
  let water:   Record<string, number>  = {};
  let battery: Record<string, unknown> = {};
  let cycles   = 0;

  if (deviceId) {
    try {
      const { getAdminDb } = await import("../../../lib/firebase-admin");
      const db = getAdminDb();
      const [s, v, w, b, c] = await Promise.all([
        db.ref(`devices/${deviceId}/sensors`).once("value"),
        db.ref(`devices/${deviceId}/valves`).once("value"),
        db.ref(`devices/${deviceId}/waterUsage/daily/${new Date().toISOString().slice(0,10)}`).once("value"),
        db.ref(`devices/${deviceId}/battery/cycleTracking`).once("value"),
        db.ref(`devices/${deviceId}/battery/cycles`).once("value"),
      ]);
      sensors = s.val() ?? {};
      valves  = v.val() ?? {};
      water   = w.val() ?? {};
      battery = b.val() ?? {};
      cycles  = Object.keys(c.val() ?? {}).length;
    } catch {
      // No device connected yet — use empty data
    }
  }

  // ── Build response based on intent + real data ────────────────────────────
  let reply = "";

  if (intent === "valve_all_status" || intent === "valve_open_count") {
    const openValves   = Object.entries(valves).filter(([,v]) => v.desiredState).map(([id]) => id);
    const closedValves = Object.entries(valves).filter(([,v]) => !v.desiredState).map(([id]) => id);

    if (Object.keys(valves).length === 0) {
      reply = RESPONSES.no_data[lang] ?? RESPONSES.no_data.en;
    } else {
      reply = (RESPONSES.valve_open_count[lang] ?? RESPONSES.valve_open_count.en)
        .replace("OPEN_COUNT",   String(openValves.length))
        .replace("OPEN_LIST",    openValves.length   ? openValves.join(", ")   : "none")
        .replace("CLOSED_COUNT", String(closedValves.length))
        .replace("CLOSED_LIST",  closedValves.length ? closedValves.join(", ") : "none");
    }
  }

  else if (intent === "temperature") {
    const temp = sensors.temperature;
    if (temp === undefined) {
      reply = RESPONSES.no_data[lang] ?? RESPONSES.no_data.en;
    } else if (temp > 35) {
      reply = (RESPONSES.temp_high[lang] ?? RESPONSES.temp_high.en).replace(/TEMP/g, String(temp));
    } else if (temp < 15) {
      reply = (RESPONSES.temp_low[lang] ?? RESPONSES.temp_low.en).replace(/TEMP/g, String(temp));
    } else {
      reply = (RESPONSES.temp_normal[lang] ?? RESPONSES.temp_normal.en).replace(/TEMP/g, String(temp));
    }
  }

  else if (intent === "water_usage") {
    const used    = water.totalLitres ?? 0;
    const total   = water.tankCapacityLitres ?? 2000;
    const percent = water.ratioPercent ?? 0;
    const adviceMap: Record<string, string> = {
      en: percent > 80 ? "⚠️ Tank almost full — reduce watering." : percent < 20 ? "Tank is getting low — check your water source." : "Tank level is good.",
      hi: percent > 80 ? "⚠️ टंकी लगभग भर गई है — पानी कम करें।" : percent < 20 ? "टंकी कम हो रही है।" : "टंकी का स्तर अच्छा है।",
      mr: percent > 80 ? "⚠️ टाकी जवळजवळ भरली — पाणी कमी करा." : percent < 20 ? "टाकी कमी होत आहे." : "टाकीची पातळी चांगली आहे.",
      pa: percent > 80 ? "⚠️ ਟੈਂਕੀ ਲਗਭਗ ਭਰ ਗਈ।" : percent < 20 ? "ਟੈਂਕੀ ਘੱਟ ਹੋ ਰਹੀ ਹੈ।" : "ਟੈਂਕੀ ਦਾ ਪੱਧਰ ਚੰਗਾ ਹੈ।",
      te: percent > 80 ? "⚠️ ట్యాంక్ దాదాపు నిండింది." : percent < 20 ? "ట్యాంక్ తక్కువగా ఉంది." : "ట్యాంక్ స్థాయి బాగుంది.",
      ta: percent > 80 ? "⚠️ தொட்டி கிட்டத்தட்ட நிரம்பியுள்ளது." : percent < 20 ? "தொட்டி குறைவாக உள்ளது." : "தொட்டி நிலை நல்லது.",
    };
    reply = (RESPONSES.water_usage[lang] ?? RESPONSES.water_usage.en)
      .replace("USED",    String(used))
      .replace("TOTAL",   String(total))
      .replace("PERCENT", String(percent))
      .replace("ADVICE",  adviceMap[lang] ?? adviceMap.en);
  }

  else if (intent === "should_water") {
    const temp    = sensors.temperature ?? 0;
    const openCount = Object.values(valves).filter(v => v.desiredState).length;
    const adviceMap: Record<string, string> = {
      en: temp > 35
        ? `It's hot (${temp}°C). Water now but ${openCount > 0 ? "valves are already open ✅" : "open your valves first"}. Best time: early morning or after 5 PM.`
        : `Temperature is ${temp}°C — good time to water. ${openCount > 0 ? `${openCount} valve(s) already open ✅` : "Open your valves to start irrigation."}`,
      hi: temp > 35
        ? `गर्मी है (${temp}°C)। अभी पानी दें — ${openCount > 0 ? "वाल्व खुले हैं ✅" : "पहले वाल्व खोलें"}। सबसे अच्छा समय: सुबह या शाम 5 बजे के बाद।`
        : `तापमान ${temp}°C है — पानी देने का अच्छा समय। ${openCount > 0 ? `${openCount} वाल्व खुले हैं ✅` : "सिंचाई शुरू करने के लिए वाल्व खोलें।"}`,
      mr: temp > 35
        ? `उष्णता आहे (${temp}°C). आता पाणी द्या — ${openCount > 0 ? "झडपा उघड्या आहेत ✅" : "आधी झडपा उघडा"}.`
        : `तापमान ${temp}°C आहे — पाणी देण्याची चांगली वेळ. ${openCount > 0 ? `${openCount} झडपा उघड्या ✅` : "सिंचनासाठी झडपा उघडा."}`,
      pa: temp > 35
        ? `ਗਰਮੀ ਹੈ (${temp}°C). ਹੁਣ ਪਾਣੀ ਦਿਓ।`
        : `ਤਾਪਮਾਨ ${temp}°C ਹੈ — ਪਾਣੀ ਦੇਣ ਦਾ ਵਧੀਆ ਸਮਾਂ।`,
      te: temp > 35
        ? `వేడిగా ఉంది (${temp}°C). ఇప్పుడు నీరు పెట్టండి.`
        : `ఉష్ణోగ్రత ${temp}°C — నీరు పెట్టడానికి మంచి సమయం.`,
      ta: temp > 35
        ? `வெப்பமாக உள்ளது (${temp}°C). இப்போது தண்ணீர் பாய்ச்சுங்கள்.`
        : `வெப்பநிலை ${temp}°C — தண்ணீர் பாய்ச்ச நல்ல நேரம்.`,
    };
    reply = adviceMap[lang] ?? adviceMap.en;
  }

  else if (intent === "battery") {
    const percent = sensors.battery ?? (battery as Record<string,number>).lastPercent ?? 0;
    const voltage = sensors.batteryVoltage ?? 0;
    const health  = Math.max(0, Math.round(100 - cycles * 0.5));
    const key     = percent < 25 ? "battery_low" : "battery_good";
    reply = (RESPONSES[key][lang] ?? RESPONSES[key].en)
      .replace(/PERCENT/g, String(percent))
      .replace(/VOLTAGE/g, String(voltage))
      .replace(/CYCLES/g,  String(cycles))
      .replace(/HEALTH/g,  String(health));
  }

  else {
    reply = RESPONSES.off_topic[lang] ?? RESPONSES.off_topic.en;
  }

  return NextResponse.json({ reply });
}