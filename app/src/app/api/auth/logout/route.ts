import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";
export async function POST() { const response = new NextResponse(null, { status: 204 }); await clearSession(response); return response; }
