import { NextResponse } from "next/server";
import { technicians } from "@/lib/repositories";
import { apiError, jsonId, requireUser } from "@/lib/api";
export const runtime = "nodejs";
export async function GET() { try { await requireUser(); return NextResponse.json({ technicians: (await technicians.list()).map(jsonId) }); } catch (e) { return apiError(e); } }
export async function POST(request: Request) { try { const user = await requireUser(); if (user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 }); const result = await technicians.create(await request.json()); return NextResponse.json({ technician: jsonId((await technicians.byId(result.insertedId.toHexString()))!) }, { status: 201 }); } catch (e) { return apiError(e); } }
