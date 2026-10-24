import { NextResponse } from "next/server";
import { users } from "@/lib/repositories";
import { verifyPassword } from "@/lib/password";

export async function GET() {
  const email = process.env.ARTURE_DEMO_LOGIN_EMAIL;
  const password = process.env.ARTURE_DEMO_LOGIN_PASSWORD;
  if (process.env.ARTURE_DEMO_MODE !== "true" || !email || !password) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  const user = await users.byEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ enabled: true, email, password }, { headers: { "Cache-Control": "no-store" } });
}
