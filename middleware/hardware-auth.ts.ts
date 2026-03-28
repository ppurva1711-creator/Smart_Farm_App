// middleware/hardware-auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validates every request coming from the SIM800L hardware using a shared
// secret defined in .env. Prevents rogue devices pushing fake sensor data.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const HARDWARE_SECRET = process.env.HARDWARE_SHARED_SECRET || "";

/**
 * Validates the `secret` field in a hardware payload.
 * The hardware computes: HMAC-SHA256(deviceId + timestamp, HARDWARE_SHARED_SECRET)
 * and sends it as `secret`.
 */
export function validateHardwareSecret(
  deviceId: string,
  timestamp: number,
  providedSecret: string
): boolean {
  if (!HARDWARE_SECRET) {
    console.warn("HARDWARE_SHARED_SECRET not set – skipping validation in dev");
    return true;
  }

  // Reject payloads older than 5 minutes (replay attack protection)
  const ageMs = Date.now() - timestamp;
  if (ageMs > 5 * 60 * 1000 || ageMs < -60_000) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", HARDWARE_SECRET)
    .update(`${deviceId}${timestamp}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(providedSecret, "hex")
  );
}

/**
 * For client API routes – verifies Firebase ID token from Authorization header.
 */
export async function verifyUserToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const { getAdminAuth } = await import("../lib/firebase");
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function unauthorizedResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}
