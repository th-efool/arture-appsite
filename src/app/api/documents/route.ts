import { requireMachineAccess } from "@/lib/machine-access";
import { isPumpDemo, waterPump } from "@/lib/demo-machine";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { apiError, jsonId, requireId, requireUser, ApiError } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { documents, machines } from "@/lib/repositories";
import { storeDocumentFile } from "@/lib/document-upload";
import { queuedKnowledge } from "@/lib/knowledge";
export const runtime = "nodejs";
const bucket = async () => new GridFSBucket(await getArtureDb(), { bucketName: "arture_documents" });
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    let machineId = new URL(request.url).searchParams.get("machineId");
    if (machineId) await requireMachineAccess(user, machineId);
    else if (isPumpDemo(user)) {
      const pump = await machines.byAssetCode(waterPump.assetCode);
      if (!pump) return NextResponse.json({ documents: [] });
      machineId = pump._id!.toHexString();
    }
    return NextResponse.json({ documents: (await documents.list(machineId ?? undefined)).map(jsonId) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  let fileId: ObjectId | undefined;
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw new ApiError(403, "Admin access required.");
    const form = await request.formData();
    const machineId = requireId(String(form.get("machineId") ?? ""));
    await requireMachineAccess(user, machineId);
    const file = await storeDocumentFile(form, new ObjectId(machineId));
    fileId = file.gridFsFileId;
    const created = await documents.create({ ...file, machineId: new ObjectId(machineId), uploadedBy: new ObjectId(user.id), knowledge: queuedKnowledge() });
    fileId = undefined;
    return NextResponse.json({ document: jsonId((await documents.byId(created.insertedId.toHexString()))!) }, { status: 201 });
  } catch (error) { if (fileId) await (await bucket()).delete(fileId).catch(() => undefined); return apiError(error); }
}
