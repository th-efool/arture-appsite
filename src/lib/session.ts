import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessions, users } from "@/lib/repositories";
import { validateArtureEnvironment } from "@/lib/env";

const SESSION_COOKIE = "arture_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
function tokenHash(token: string) { return createHmac("sha256", validateArtureEnvironment().authSecret).update(token).digest("hex"); }
function secureCookie() { return new URL(validateArtureEnvironment().appUrl).protocol === "https:"; }

export async function createSession(userId: Parameters<typeof sessions.create>[0]["userId"]) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await sessions.create({ tokenHash: tokenHash(token), userId, expiresAt });
  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, session: { token: string; expiresAt: Date }) {
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, secure: secureCookie(), sameSite: "lax", path: "/", expires: session.expiresAt });
}

export async function clearSession(response: NextResponse) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sessions.remove(tokenHash(token));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: secureCookie(), sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await sessions.byTokenHash(tokenHash(token));
  if (!session) return null;
  const user = await users.byId(session.userId);
  return user ? { id: user._id!.toHexString(), email: user.email, name: user.name, role: user.role, demoAccount: user.demoAccount === true } : null;
}
