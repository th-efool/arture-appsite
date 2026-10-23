import "server-only";

import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { sessions, users } from "@/lib/repositories";
import { validateArtureEnvironment } from "@/lib/env";

const SESSION_COOKIE = "arture_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
function tokenHash(token: string) { return createHmac("sha256", validateArtureEnvironment().authSecret).update(token).digest("hex"); }

export async function createSession(userId: Parameters<typeof sessions.create>[0]["userId"]) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await sessions.create({ tokenHash: tokenHash(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sessions.remove(tokenHash(token));
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await sessions.byTokenHash(tokenHash(token));
  if (!session) return null;
  const user = await users.byId(session.userId);
  return user ? { id: user._id!.toHexString(), email: user.email, name: user.name, role: user.role } : null;
}
