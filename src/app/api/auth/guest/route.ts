import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getArtureDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { demoGuestEmail } from "@/lib/demo-machine";

export async function POST() {
  if (process.env.ARTURE_DEMO_MODE !== "true" || process.env.ARTURE_GUEST_LOGIN_ENABLED !== "true") return NextResponse.json({ error: "Guest access is not enabled." }, { status: 403 });
  const collection = (await getArtureDb()).collection("arture_users");
  const existing = await collection.findOne({ email: demoGuestEmail });
  if (existing && (!existing.guestAccount || existing.role !== "technician")) return NextResponse.json({ error: "Guest account configuration conflicts with an existing account." }, { status: 409 });
  const now = new Date();
  const user = existing ?? await collection.findOneAndUpdate({ email: demoGuestEmail }, { $setOnInsert: { email: demoGuestEmail, name: "Guest", role: "technician", guestAccount: true, passwordHash: await hashPassword(randomBytes(32).toString("base64url")), createdAt: now, updatedAt: now } }, { upsert: true, returnDocument: "after" });
  if (!user?.guestAccount || user.role !== "technician") return NextResponse.json({ error: "Guest access could not be started." }, { status: 409 });
  const response = NextResponse.json({ user: { id: user._id.toHexString(), email: user.email, name: user.name, role: user.role } });
  setSessionCookie(response, await createSession(user._id));
  return response;
}
