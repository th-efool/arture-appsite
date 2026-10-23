import { NextResponse } from "next/server";
import { activity, machines } from "@/lib/repositories";
import { apiError, jsonId, requireUser } from "@/lib/api";
export const runtime = "nodejs";
export async function GET() { try { await requireUser(); return NextResponse.json({ machines: (await machines.list()).map(jsonId) }); } catch (e) { return apiError(e); } }
export async function POST(request: Request) { try { const user = await requireUser(); if (user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 }); const result = await machines.create(await request.json()); await activity.record({ actorId: new (await import("mongodb")).ObjectId(user.id), action: "created", entityType: "machine", entityId: result.insertedId }); return NextResponse.json({ machine: jsonId((await machines.byId(result.insertedId.toHexString()))!) }, { status: 201 }); } catch (e) { return apiError(e); } }
