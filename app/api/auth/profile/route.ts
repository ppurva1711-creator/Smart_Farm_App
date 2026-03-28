import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { verifyUserToken, unauthorizedResponse } from "../../../../middleware/hardware-auth";

export async function GET(req: NextRequest) {
  const uid = await verifyUserToken(req);
  if (!uid) return unauthorizedResponse("Login required");

  const db   = getAdminDb();
  const snap = await db.ref(`users/${uid}`).once("value");

  if (!snap.exists()) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(snap.val());
}
