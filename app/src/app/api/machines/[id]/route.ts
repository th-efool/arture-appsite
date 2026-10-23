import { NextResponse } from "next/server";
import { machines } from "@/lib/repositories";
import { apiError, jsonId, requireId, requireUser } from "@/lib/api";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Ctx) { try { await requireUser(); const machine = await machines.byId(requireId((await params).id)); if (!machine) return NextResponse.json({ error: "Machine not found." }, { status: 404 }); return NextResponse.json({ machine: jsonId(machine) }); } catch (e) { return apiError(e); } }
export async function PATCH(request: Request, { params }: Ctx) { try { const user = await requireUser(); if (user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 }); const machine = await machines.update(requireId((await params).id), await request.json()); if (!machine) return NextResponse.json({ error: "Machine not found." }, { status: 404 }); return NextResponse.json({ machine: jsonId(machine) }); } catch (e) { return apiError(e); } }
export async function DELETE(_: Request, { params }: Ctx) { try { const user = await requireUser(); if (user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 }); const result = await machines.archive(requireId((await params).id)); return new NextResponse(null, { status: result.matchedCount ? 204 : 404 }); } catch (e) { return apiError(e); } }
