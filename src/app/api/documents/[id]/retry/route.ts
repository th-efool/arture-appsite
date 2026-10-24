import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { ApiError, apiError, requireId, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { documents } from "@/lib/repositories";
import { requireMachineAccess } from "@/lib/machine-access";
import { retryKnowledge } from "@/lib/knowledge";
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw new ApiError(403, "Admin access required.");
    const id = requireId((await context.params).id);
    const document = await documents.byId(id);
    if (!document) throw new ApiError(404, "Document not found.");
    await requireMachineAccess(user, document.machineId.toHexString());
    if (!await retryKnowledge(await getArtureDb(), new ObjectId(id))) throw new ApiError(409, "Document is already queued or processing.");
    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (error) { return apiError(error); }
}
