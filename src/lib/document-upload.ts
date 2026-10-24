import { GridFSBucket, ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { ApiError } from "./api";
import { getArtureDb } from "./db";
import { validateArtureEnvironment } from "./env";
import { safeFileName, validateDocumentFile } from "./uploads";

export async function storeDocumentFile(form: FormData, machineId: ObjectId) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Document file is required.");
  const max = validateArtureEnvironment().uploadMaxBytes;
  if (file.size <= 0 || file.size > max) throw new ApiError(400, "File exceeds Arture upload limit.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let mimeType: string;
  try { mimeType = validateDocumentFile(file.name, file.type, bytes, max); }
  catch (error) { throw new ApiError(400, error instanceof Error ? error.message : "Invalid file."); }
  const originalName = safeFileName(file.name);
  const storage = new GridFSBucket(await getArtureDb(), { bucketName: "arture_documents" });
  const stream = storage.openUploadStream(originalName, { metadata: { artureMachineId: machineId, originalName, mimeType } });
  try {
    await new Promise<void>((resolve, reject) => { stream.once("error", reject); stream.once("finish", resolve); Readable.from(Buffer.from(bytes)).pipe(stream); });
  } catch (error) { await storage.delete(stream.id).catch(() => undefined); throw error; }
  return { gridFsFileId: stream.id, originalName, mimeType, size: bytes.byteLength };
}
