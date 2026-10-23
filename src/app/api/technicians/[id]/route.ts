import { NextResponse } from "next/server";
import { technicians } from "@/lib/repositories";
import { apiError, jsonId, requireId, requireUser } from "@/lib/api";
export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); if (user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 }); const technician = await technicians.update(requireId((await params).id), await request.json()); if (!technician) return NextResponse.json({ error: "Technician not found." }, { status: 404 }); return NextResponse.json({ technician: jsonId(technician) }); } catch (e) { return apiError(e); } }
