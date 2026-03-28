import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";
import { verifyUserToken, unauthorizedResponse } from "../../../middleware/hardware-auth";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  pa: "Punjabi",
  te: "Telugu",
  ta: "Tamil",
};

export async function POST(req: NextRequest) {
  // Allow unauthenticated for now so chatbot works before login
  const uid = await verifyUserToken(req);

  const { deviceId, message, history = [], language = "en" } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // ── Fetch live device context ──────────────────────────────────────────────
  let sensorInfo = "No sensor data available yet.";
  let valveInfo  = "No valve data available yet.";
  let waterInfo  = "No water usage data yet.";

  try {
    if (deviceId && uid) {
      const db = getAdminDb();
      const [sensSnap, valvSnap, waterSnap] = await Promise.all([
        db.ref(`devices/${deviceId}/sensors`).once("value"),
        db.ref(`devices/${deviceId}/valves`).once("value"),
        db.ref(`devices/${deviceId}/waterUsage/daily/${todayKey()}`).once("value"),
      ]);

      const sensors = sensSnap.val();
      const valves  = valvSnap.val();
      const water   = waterSnap.val();

      if (sensors) {
        sensorInfo = `Temperature: ${sensors.temperature ?? "?"}°C, Humidity: ${sensors.humidity ?? "?"}%, Battery: ${sensors.battery ?? "?"}%`;
      }
      if (valves) {
        valveInfo = Object.entries(valves as Record<string, Record<string, unknown>>)
          .map(([id, v]) => `${id}: ${v.desiredState ? "OPEN" : "CLOSED"}`)
          .join(", ");
      }
      if (water) {
        waterInfo = `Today: ${water.totalLitres ?? 0}L used of ${water.tankCapacityLitres ?? 2000}L (${water.ratioPercent ?? 0}%)`;
      }
    }
  } catch {
    // Continue without device data
  }

  const langName = LANGUAGE_NAMES[language] ?? "English";

  const systemPrompt = `You are a helpful smart farming assistant for Indian farmers using the Smart Farm IoT app.

ALWAYS respond in ${langName} language only.

You ONLY answer questions about:
- Valve control and irrigation
- Temperature and weather advice for crops  
- Water usage and tank levels
- Battery health and power
- General farming and irrigation advice

For off-topic questions, politely say you only help with farm topics.

CURRENT FARM DATA:
- Sensors: ${sensorInfo}
- Valves: ${valveInfo}
- Water: ${waterInfo}

Keep responses short and practical for farmers in the field.`;

  // ── Build conversation for Gemini ─────────────────────────────────────────
  const geminiMessages = [
    // Include last 6 messages as conversation history
    ...history.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];

  // ── Call Gemini API ────────────────────────────────────────────────────────
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return NextResponse.json(
      { reply: "Chatbot not configured. Please add GEMINI_API_KEY to environment variables." },
      { status: 200 }
    );
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: geminiMessages,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return NextResponse.json(
        { reply: "AI service error. Please try again." },
        { status: 200 }
      );
    }

    const geminiData = await geminiRes.json();
    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I could not get a response. Please try again.";

    // Save to Firebase if user is logged in
    if (uid && deviceId) {
      try {
        const db = getAdminDb();
        await db.ref(`users/${uid}/chatHistory`).push({
          role: "user", content: message, timestamp: Date.now(),
        });
        await db.ref(`users/${uid}/chatHistory`).push({
          role: "assistant", content: reply, timestamp: Date.now(),
        });
      } catch {
        // Don't fail if history save fails
      }
    }

    return NextResponse.json({ reply });

  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { reply: "Network error. Please check your connection and try again." },
      { status: 200 }
    );
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
