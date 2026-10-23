import { NextResponse } from "next/server";
import { ApiError, apiError, jsonId } from "@/lib/api";
import { requireIngestKey } from "@/lib/ingest";
import { workEventSchema } from "@/lib/schemas";
import { activity, machines, maintenanceLogs, technicians } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireIngestKey(request);
    const input = workEventSchema.parse(await request.json());
    const matches = await technicians.matchesByPhone(input.phone);
    if (!matches.length) throw new ApiError(404, "No worker is registered for this phone number.");
    if (matches.length > 1) throw new ApiError(409, "More than one worker matches this phone number.");
    const worker = matches[0];
    if (!worker.active) throw new ApiError(409, "This worker is not active.");
    const system = input.systemId ? await machines.byId(input.systemId) : await machines.byAssetCode(input.assetCode!);
    if (!system) throw new ApiError(404, "No connected system matches the supplied identifier.");
    const result = await maintenanceLogs.create({ machineId: system._id!.toHexString(), technicianId: worker._id!.toHexString(), serviceDate: input.completedAt ?? new Date(), minutesSpent: input.minutesSpent, notes: `${input.task}${input.details ? `\n\n${input.details}` : ""}` }, worker.name);
    const event = (await maintenanceLogs.list(system._id!.toHexString())).find((entry) => entry._id?.equals(result.insertedId));
    await activity.record({ actorId: worker._id!, action: "documented work event", entityType: "machine", entityId: system._id! });
    return NextResponse.json({ worker: { id: worker._id!.toHexString(), name: worker.name, specialty: worker.specialty }, system: { id: system._id!.toHexString(), assetCode: system.assetCode, name: system.name, location: system.location }, event: jsonId(event!) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
