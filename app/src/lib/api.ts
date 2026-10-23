import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/session";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in required.");
  return user;
}
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request.", issues: error.flatten() }, { status: 400 });
  if (error instanceof Error && error.message.startsWith("Missing required environment variable")) return NextResponse.json({ error: "Arture database is not configured." }, { status: 503 });
  return NextResponse.json({ error: "Request failed." }, { status: 500 });
}
export const idPattern = /^[a-f\d]{24}$/i;
export function requireId(id: string) { if (!idPattern.test(id)) throw new ApiError(400, "Invalid record id."); return id; }
export function jsonId(record: { _id?: { toHexString(): string } }) { return { ...record, id: record._id?.toHexString(), _id: undefined }; }
