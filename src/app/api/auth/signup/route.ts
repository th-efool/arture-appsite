import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/schemas";
import { users } from "@/lib/repositories";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = signupSchema.parse(await request.json());
    if (await users.byEmail(input.email)) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    const created = await users.create({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: "technician",
      demoAccount: process.env.ARTURE_DEMO_MODE === "true",
    });
    const user = { id: created.insertedId.toHexString(), email: input.email, name: input.name, role: "technician" as const, demoAccount: process.env.ARTURE_DEMO_MODE === "true" };
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, await createSession(created.insertedId));
    return response;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    return NextResponse.json({ error: "Use a name, valid email, and a password of at least 12 characters." }, { status: 400 });
  }
}
