import { NextResponse } from "next/server";
import { ApiError, apiError, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { requireMachineAccess } from "@/lib/machine-access";
import { conversationIdPattern, getConversation } from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!conversationIdPattern.test(id)) throw new ApiError(400, "Invalid conversation id.");
    const afterValue = new URL(request.url).searchParams.get("after") ?? "0";
    if (!/^\d{1,8}$/.test(afterValue)) throw new ApiError(400, "Invalid event cursor.");
    const db = await getArtureDb();
    const record = await db.collection("arture_conversations").findOne({ conversationId: id }, { projection: { machineId: 1 } });
    if (!record) throw new ApiError(404, "Session not found.");
    await requireMachineAccess(user, record.machineId.toHexString());
    const result = await getConversation(db, id, Number(afterValue));
    if (!result) throw new ApiError(404, "Session not found.");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
