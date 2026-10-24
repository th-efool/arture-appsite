import { NextResponse } from "next/server";
import { maintenanceLogs, technicians, machines } from "@/lib/repositories";
import { apiError, jsonId, requireUser } from "@/lib/api";
import { requireMachineAccess } from "@/lib/machine-access";
import { isPumpDemo, isGuest, waterPump } from "@/lib/demo-machine";
import { maintenanceSchema } from "@/lib/schemas";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    let id = new URL(request.url).searchParams.get("machineId") ?? undefined;
    if (id) await requireMachineAccess(user, id);
    else if (isPumpDemo(user)) {
      const pump = await machines.byAssetCode(waterPump.assetCode);
      if (!pump) return NextResponse.json({ logs: [] });
      id = pump._id!.toHexString();
    }
    return NextResponse.json({ logs: (await maintenanceLogs.list(id)).map(jsonId) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (isGuest(user)) return NextResponse.json({ error: "Guest access is read-only. Sign in as an administrator to make changes." }, { status: 403 });
    const input = maintenanceSchema.parse(await request.json());
    await requireMachineAccess(user, input.machineId);
    const technician = await technicians.byId(input.technicianId);
    if (!technician) return NextResponse.json({ error: "Worker not found." }, { status: 404 });
    const result = await maintenanceLogs.create(input, technician.name);
    return NextResponse.json({ log: jsonId((await maintenanceLogs.list(input.machineId)).find(log => log._id?.equals(result.insertedId))!) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
