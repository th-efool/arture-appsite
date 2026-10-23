import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";
export async function POST() { await clearSession(); return new NextResponse(null, { status: 204 }); }
