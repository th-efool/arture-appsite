import { NextResponse } from "next/server";
import { ApiError, apiError, requireId, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { requireMachineAccess } from "@/lib/machine-access";
import { conversationIdPattern, listConversations } from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const query = new URL(request.url).searchParams;
    const machineId = requireId(query.get("machineId") ?? "");
    await requireMachineAccess(user, machineId);
    let cursor: { startedAt: Date; id: string } | undefined;
    if (query.has("cursor")) {
      try {
        const encoded = query.get("cursor")!;
        if (encoded.length > 512) throw new Error();
        const value = JSON.parse(Buffer.from(encoded, "base64url").toString());
        const startedAt = new Date(value.startedAt);
        if (!Number.isFinite(startedAt.getTime()) || !conversationIdPattern.test(value.id)) throw new Error();
        cursor = { startedAt, id: value.id };
      } catch { throw new ApiError(400, "Invalid session cursor."); }
    }
    return NextResponse.json(await listConversations(await getArtureDb(), machineId, cursor), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
