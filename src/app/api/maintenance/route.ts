import { NextResponse } from "next/server";
import { maintenanceLogs, technicians } from "@/lib/repositories";
import { apiError, jsonId, requireUser } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(request: Request) { try { await requireUser(); const id = new URL(request.url).searchParams.get("machineId") ?? undefined; return NextResponse.json({ logs: (await maintenanceLogs.list(id)).map(jsonId) }); } catch (e) { return apiError(e); } }
export async function POST(request: Request) { try { await requireUser(); const input = await request.json(); const technician = await technicians.byId(input.technicianId); if (!technician) return NextResponse.json({ error: "Technician not found." }, { status: 404 }); const result = await maintenanceLogs.create(input, technician.name); return NextResponse.json({ log: jsonId((await maintenanceLogs.list(input.machineId)).find(x => x._id?.equals(result.insertedId))!) }, { status: 201 }); } catch (e) { return apiError(e); } }
