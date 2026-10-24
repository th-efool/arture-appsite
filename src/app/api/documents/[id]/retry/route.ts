import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { ApiError, apiError, requireId, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { documents } from "@/lib/repositories";
import { requireMachineAccess } from "@/lib/machine-access";
import { retryKnowledge, triggerKnowledgeProcessing } from "@/lib/knowledge";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw new ApiError(403, "Admin access required.");
    const id = requireId((await context.params).id);
    const document = await documents.byId(id);
    if (!document) throw new ApiError(404, "Document not found.");
    await requireMachineAccess(user, document.machineId.toHexString());
    const db = await getArtureDb();
    if (!(await retryKnowledge(db, new ObjectId(id)))) throw new ApiError(409, "Document is already queued or processing.");

    // Notify Render relay to process the retried document in background container
    const relayBase = (process.env.ARTURE_RELAY_URL || "https://arture-voice-relay.onrender.com").replace(/\/+$/, "");
    const relayKey = (process.env.ARTURE_RELAY_ACCESS_KEY || "").trim();
    if (relayBase && !relayBase.includes("localhost")) {
      fetch(`${relayBase}/api/process-job`, {
        method: "POST",
        headers: relayKey ? { Authorization: `Bearer ${relayKey}` } : {},
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }

    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
