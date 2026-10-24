import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { getAppConnections } from "@/lib/app-connections";
import { machines } from "@/lib/repositories";
import { visibleMachineFilter } from "@/lib/demo-machine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireUser();
    const visible = await machines.list(visibleMachineFilter(user));
    return NextResponse.json({ connections: await getAppConnections(await getArtureDb(), visible.map(machine => machine.assetCode)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
