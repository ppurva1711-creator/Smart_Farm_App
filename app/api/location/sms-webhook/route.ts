// app/api/location/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/location/request   ← user taps "Get Location" button
//   → Sends SMS "LOCATION" to hardware SIM via Twilio
//
// POST  /api/location/sms-webhook  ← Twilio calls this when hardware replies
//   → Parses "LOC:18.7645,73.4120" and writes to Firebase
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase";
import { verifyUserToken, unauthorizedResponse } from "../../../middleware/hardware-auth";

// ── Twilio client (lazy import so server-only) ────────────────────────────────
async function getTwilio() {
  const twilio = await import("twilio");
  return twilio.default(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
}

// ── POST /api/location/request ────────────────────────────────────────────────
// User presses the location button → we SMS the hardware
export async function POST(req: NextRequest) {
  const url = req.nextUrl.pathname;

  if (url.endsWith("/request")) {
    return handleLocationRequest(req);
  } else if (url.endsWith("/sms-webhook")) {
    return handleSmsWebhook(req);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function handleLocationRequest(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const { deviceId } = await req.json();
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  // 1. Look up the hardware SIM number for this device
  const db       = getAdminDb();
  const simSnap  = await db.ref(`devices/${deviceId}/config/hardwareSimNumber`).once("value");
  const hardwareSim: string | null = simSnap.val();

  if (!hardwareSim) {
    return NextResponse.json(
      { error: "Hardware SIM number not configured. Please add it in Settings." },
      { status: 400 }
    );
  }

  // 2. Send "LOCATION" SMS command to the SIM800L
  try {
    const client = await getTwilio();
    await client.messages.create({
      body: "LOCATION",                           // command the hardware recognises
      from: process.env.TWILIO_PHONE_NUMBER!,     // your Twilio number
      to: hardwareSim,                            // SIM800L's SIM number
    });

    // 3. Mark location as "pending" so the UI can show a spinner
    await db.ref(`devices/${deviceId}/location`).update({
      pending: true,
      requestedAt: Date.now(),
      requestedBy: uid,
    });

    return NextResponse.json({ ok: true, message: "Location request sent to hardware" });
  } catch (err) {
    console.error("Twilio SMS error:", err);
    return NextResponse.json({ error: "Failed to send SMS to hardware" }, { status: 500 });
  }
}

// ── Twilio webhook: hardware replies with "LOC:18.7645,73.4120" ───────────────
// Configure this URL in Twilio console → Phone Numbers → Messaging → Webhook
async function handleSmsWebhook(req: NextRequest) {
  // Twilio sends form-encoded body
  const formData = await req.formData();
  const from     = formData.get("From") as string;   // hardware SIM number
  const body     = (formData.get("Body") as string)?.trim();

  if (!body || !from) {
    return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  // ── Parse "LOC:lat,lng" ────────────────────────────────────────────────────
  if (body.startsWith("LOC:")) {
    const coords = body.slice(4); // "18.7645,73.4120"
    const [latStr, lngStr] = coords.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!isNaN(lat) && !isNaN(lng)) {
      const db = getAdminDb();

      // Find which device this SIM belongs to
      const devicesSnap = await db.ref("devices").once("value");
      const devices = devicesSnap.val() ?? {};

      for (const [deviceId, data] of Object.entries(devices)) {
        const config = (data as Record<string, unknown>).config as Record<string, unknown> | undefined;
        if (config?.hardwareSimNumber === from) {
          await db.ref(`devices/${deviceId}/location`).set({
            lat,
            lng,
            source: "gsm-cell",
            timestamp: Date.now(),
            accuracy: 150,
            pending: false,
          });
          break;
        }
      }
    }
  }

  // ── Parse "TEMP:34.5,BAT:78" (optional status SMS from hardware) ─────────
  if (body.startsWith("STATUS:")) {
    // Hardware can proactively send status updates via SMS as fallback
    // Format: "STATUS:TEMP:34.5,BAT:78,V1:1,V2:0"
    const parts: Record<string, string> = {};
    body.replace("STATUS:", "").split(",").forEach((p) => {
      const [k, v] = p.split(":");
      parts[k] = v;
    });

    const db = getAdminDb();
    const devicesSnap = await db.ref("devices").once("value");
    const devices = devicesSnap.val() ?? {};

    for (const [deviceId, data] of Object.entries(devices)) {
      const config = (data as Record<string, unknown>).config as Record<string, unknown> | undefined;
      if (config?.hardwareSimNumber === from) {
        const update: Record<string, unknown> = { timestamp: Date.now() };
        if (parts.TEMP) update.temperature = parseFloat(parts.TEMP);
        if (parts.BAT)  update.battery = parseInt(parts.BAT, 10);
        await db.ref(`devices/${deviceId}/sensors`).update(update);
        break;
      }
    }
  }

  // Twilio expects a TwiML response (empty = no reply SMS)
  return new NextResponse("<Response/>", {
    headers: { "Content-Type": "text/xml" },
  });
}
