import { NextResponse } from "next/server";
import { ApiError, apiError } from "@/lib/api";
import { requireIngestKey } from "@/lib/ingest";
import { workerLookupSchema } from "@/lib/schemas";
import { technicians } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    requireIngestKey(request);
    const phone = workerLookupSchema.parse({ phone: new URL(request.url).searchParams.get("phone") ?? "" }).phone;
    const matches = await technicians.matchesByPhone(phone);
    if (!matches.length) throw new ApiError(404, "No worker is registered for this phone number.");
    if (matches.length > 1) throw new ApiError(409, "More than one worker matches this phone number.");
    const worker = matches[0];
    return NextResponse.json({ worker: { id: worker._id!.toHexString(), name: worker.name, specialty: worker.specialty, active: worker.active } });
  } catch (error) {
    return apiError(error);
  }
}
