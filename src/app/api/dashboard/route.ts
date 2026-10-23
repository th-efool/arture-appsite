import { NextResponse } from "next/server";
import { activity, machines, maintenanceLogs } from "@/lib/repositories";
import { apiError, jsonId, requireUser } from "@/lib/api";
export const runtime = "nodejs";
export async function GET() { try { await requireUser(); const all = await machines.list(); const logs = await maintenanceLogs.list(); return NextResponse.json({ metrics: { registered: all.length, operational: all.filter(x => x.status === "operational").length, attention: all.filter(x => x.status !== "operational").length }, attention: all.filter(x => x.status !== "operational").map(jsonId), activity: (await activity.list()).map(jsonId), recentMaintenance: logs.slice(0, 8).map(jsonId) }); } catch (e) { return apiError(e); } }
