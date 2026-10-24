import { ApiError, requireId } from "./api";
import { machines } from "./repositories";
import { isPumpDemo, waterPump } from "./demo-machine";

export async function requireMachineAccess(user: { email?: string }, id: string) {
  const machine = await machines.byId(requireId(id));
  if (!machine || (isPumpDemo(user) && machine.assetCode !== waterPump.assetCode)) {
    throw new ApiError(404, "Machine not found.");
  }
  return machine;
}
