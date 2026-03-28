// app/api/chat/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/chat
// Farming-specific chatbot powered by Claude.
// Scoped to: valve help, irrigation, temperature, water usage, battery queries.
// Responds in the user's selected language.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase";
import { verifyUserToken, unauthorizedResponse } from "../../../middleware/hardware-auth";
import type { ChatMessage } from "../../../types";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  pa: "Punjabi",
  te: "Telugu",
  ta: "Tamil",
};

export async function POST(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const { deviceId, message, history = [], language = "en" }
    : { deviceId: string; message: string; history: ChatMessage[]; language: string }
    = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // ── Fetch live device context to ground chatbot responses ─────────────────
  const db       = getAdminDb();
  const sensSnap = await db.ref(`devices/${deviceId}/sensors`).once("value");
  const valvSnap = await db.ref(`devices/${deviceId}/valves`).once("value");
  const waterSnap = await db.ref(
    `devices/${deviceId}/waterUsage/daily/${new Date().toISOString().slice(0, 10)}`
  ).once("value");
  const batSnap  = await db.ref(`devices/${deviceId}/battery`).once("value");

  const sensors  = sensSnap.val()  ?? {};
  const valves   = valvSnap.val()  ?? {};
  const water    = waterSnap.val() ?? {};
  const battery  = batSnap.val()   ?? {};

  // Summarise valve states for the system prompt
  const valveSummary = Object.entries(valves as Record<string, Record<string, unknown>>)
    .map(([id, v]) => `${id}: ${v.desiredState ? "OPEN" : "CLOSED"}`)
    .join(", ");

  const langName = LANGUAGE_NAMES[language] ?? "English";

  const systemPrompt = `You are a helpful smart-farming assistant built into the Smart Farm app used by Indian farmers.

ALWAYS respond in ${langName}. If the user writes in a different language, still respond in ${langName}.

You are ONLY allowed to answer questions related to:
- Valve control and irrigation schedules
- Current sensor readings and what they mean for crops
- Water usage and tank capacity
- Battery health and power management
- General crop and farming advice related to irrigation
- Troubleshooting the Smart Farm hardware

For any off-topic question, politely say you can only help with farm-related topics.

CURRENT FARM STATUS (real-time data):
- Temperature: ${sensors.temperature ?? "unknown"}°C
- Humidity: ${sensors.humidity ?? "unknown"}%
- Battery: ${sensors.battery ?? "unknown"}% (${sensors.batteryVoltage ?? "?"}V)
- Valve states: ${valveSummary || "no data"}
- Today's water used: ${water.totalLitres ?? 0} litres of ${water.tankCapacityLitres ?? 2000}L capacity (${water.ratioPercent ?? 0}% of tank)
- Battery charge cycles: ${battery?.cycleTracking ? "tracked" : "not yet recorded"}

When giving advice, always reference the actual sensor numbers above.
Keep responses short and practical – these are busy farmers in the field.`;

  // ── Build message history for multi-turn context ──────────────────────────
  const messages = [
    ...history.slice(-6).map((m) => ({          // keep last 6 turns for context
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // ── Call Claude API ───────────────────────────────────────────────────────
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const claudeData = await claudeRes.json();
  const reply: string = claudeData.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");

  // ── Save chat to Firebase (optional – for chat history) ───────────────────
  const chatRef = db.ref(`users/${uid}/chatHistory`);
  await chatRef.push({ role: "user",      content: message, timestamp: Date.now() });
  await chatRef.push({ role: "assistant", content: reply,   timestamp: Date.now() });

  return NextResponse.json({ reply });
}
