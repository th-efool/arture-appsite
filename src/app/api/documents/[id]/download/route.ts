import { requireMachineAccess } from "@/lib/machine-access";
import { NextResponse } from "next/server";
import { GridFSBucket } from "mongodb";
import { Readable } from "node:stream";
import { apiError, requireId, requireUser } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { documents } from "@/lib/repositories";
import { downloadDisposition } from "@/lib/uploads";
export const runtime = "nodejs"; type Ctx = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Ctx) { try { const user = await requireUser(); const document = await documents.byId(requireId((await params).id)); if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 }); await requireMachineAccess(user, document.machineId.toHexString()); const storage = new GridFSBucket(await getArtureDb(), { bucketName: "arture_documents" }); const stream = storage.openDownloadStream(document.gridFsFileId); return new NextResponse(Readable.toWeb(stream) as ReadableStream, { headers: { "Content-Type": document.mimeType, "Content-Length": String(document.size), "Content-Disposition": downloadDisposition(document.originalName), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } }); } catch (error) { return apiError(error); } }
