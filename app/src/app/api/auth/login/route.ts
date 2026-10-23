import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { users } from "@/lib/repositories";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await users.byEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const session = await createSession(user._id!);
    const response = NextResponse.json({ user: { id: user._id!.toHexString(), email: user.email, name: user.name, role: user.role } });
    setSessionCookie(response, session);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }
}
