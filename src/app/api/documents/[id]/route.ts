import { requireMachineAccess } from "@/lib/machine-access";
import { activity, ArtureDocumentRecord } from "@/lib/repositories";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { GridFSBucket } from "mongodb";
import { apiError, requireId, requireUser, ApiError, jsonId } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { documents } from "@/lib/repositories";
import { queuedKnowledge } from "@/lib/knowledge";
import { storeDocumentFile } from "@/lib/document-upload";
export const runtime = "nodejs"; type Ctx = { params: Promise<{ id: string }> };
async function authorize(context: Ctx) {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "Admin access required.");
  const document = await documents.byId(requireId((await context.params).id));
  if (!document) throw new ApiError(404, "Document not found.");
  await requireMachineAccess(user, document.machineId.toHexString());
  return { user, document };
}
export async function DELETE(_: Request, context: Ctx) {
  try {
    const { user, document } = await authorize(context);
    const db = await getArtureDb();
    // Removing metadata invalidates search results immediately, including stale Atlas entries.
    await documents.remove(document._id!.toHexString());
    await db.collection("arture_knowledge_chunks").deleteMany({ documentId: document._id });
    await new GridFSBucket(db, { bucketName: "arture_documents" }).delete(document.gridFsFileId).catch(() => undefined);
    await activity.record({ actorId: new ObjectId(user.id), action: "deleted document", entityType: "machine", entityId: document.machineId });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
export async function PUT(request: Request, context: Ctx) {
  let newFile: ObjectId | undefined;
  try {
    const { user, document } = await authorize(context);
    const db = await getArtureDb();
    const file = await storeDocumentFile(await request.formData(), document.machineId);
    newFile = file.gridFsFileId;
    const updated = await db.collection<ArtureDocumentRecord>("arture_document_records").findOneAndUpdate({ _id: document._id, gridFsFileId: document.gridFsFileId }, { $set: { ...file, uploadedBy: new ObjectId(user.id), knowledge: queuedKnowledge((document.knowledge?.revision ?? 0) + 1) } }, { returnDocument: "after" });
    if (!updated) throw new ApiError(409, "Document changed while replacing it. Refresh and try again.");
    newFile = undefined;
    if (document.knowledge?.generation) await db.collection("arture_knowledge_chunks").deleteMany({ generation: document.knowledge.generation });
    await new GridFSBucket(db, { bucketName: "arture_documents" }).delete(document.gridFsFileId).catch(() => undefined);
    return NextResponse.json({ document: jsonId(updated) });
  } catch (error) {
    if (newFile) await new GridFSBucket(await getArtureDb(), { bucketName: "arture_documents" }).delete(newFile).catch(() => undefined);
    return apiError(error);
  }
}
