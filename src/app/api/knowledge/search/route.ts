import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { ApiError, apiError, requireId, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { requireMachineAccess } from "@/lib/machine-access";
import { knowledgeOptions, searchKnowledge } from "@/lib/knowledge";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await request.json().catch(() => null);
    if (!input || typeof input.machineId !== "string" || typeof input.query !== "string" || !input.query.trim() || input.query.length > 500) throw new ApiError(400, "Choose a machine and enter a search of 1–500 characters.");
    await requireMachineAccess(user, requireId(input.machineId));
    try { return NextResponse.json(await searchKnowledge(await getArtureDb(), new ObjectId(input.machineId), input.query, knowledgeOptions()), { headers: { "Cache-Control": "no-store" } }); }
    catch { throw new ApiError(503, "Document search is unavailable. Check the knowledge worker, embedding key, and search index."); }
  } catch (error) { return apiError(error); }
}
