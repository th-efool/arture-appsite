import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { getWorkspaceDashboard } from "@/lib/workspace-dashboard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getWorkspaceDashboard(await getArtureDb(), user), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
