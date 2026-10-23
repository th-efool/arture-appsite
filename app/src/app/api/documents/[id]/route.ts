import { NextResponse } from "next/server";
import { GridFSBucket } from "mongodb";
import { apiError, requireId, requireUser, ApiError } from "@/lib/api";
import { getArtureDb } from "@/lib/db";
import { documents } from "@/lib/repositories";
export const runtime = "nodejs"; type Ctx = { params: Promise<{ id: string }> };
export async function DELETE(_: Request, { params }: Ctx) { try { const user = await requireUser(); if (user.role !== "admin") throw new ApiError(403, "Admin access required."); const document = await documents.byId(requireId((await params).id)); if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 }); const storage = new GridFSBucket(await getArtureDb(), { bucketName: "arture_documents" }); await storage.delete(document.gridFsFileId); await documents.remove(document._id!.toHexString()); return new NextResponse(null, { status: 204 }); } catch (error) { return apiError(error); } }
