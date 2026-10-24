import type { Db } from "mongodb";
import { waterPump } from "./demo-machine";

const oldAssetCodes = ["ATR-DEMO-001", "ATR-DEMO-002", "ATR-DEMO-003"];
const oldLogKeys = ["arture-demo-laser-alignment-v1", "arture-demo-router-inspection-v1", "arture-demo-former-assessment-v1"];

/** Only archives records bearing the exact legacy seed identity. Never deletes data. */
export async function migrateWaterPump(db: Db) {
  const machines = db.collection("arture_machines");
  const seedKey = "arture-demo-water-pump-v1";
  const existing = await machines.findOne({ assetCode: waterPump.assetCode });
  if (existing && existing.seedKey !== seedKey) {
    throw new Error("Water pump asset code belongs to a non-seeded record; migration stopped.");
  }
  const now = new Date();
  await machines.updateOne({ assetCode: waterPump.assetCode }, {
    $setOnInsert: { ...waterPump, seedKey, archivedAt: null, createdAt: now, updatedAt: now },
  }, { upsert: true });
  let archivedMachines = 0;
  let preservedMachinesWithRecords = 0;
  for (const assetCode of oldAssetCodes) {
    const legacy = await machines.findOne({ assetCode, seedKey: `arture-demo-machine-${assetCode}-v1`, archivedAt: null });
    if (!legacy) continue;
    const [document, realWork] = await Promise.all([
      db.collection("arture_document_records").findOne({ machineId: legacy._id }, { projection: { _id: 1 } }),
      db.collection("arture_maintenance_logs").findOne({ machineId: legacy._id, seedKey: { $nin: oldLogKeys } }, { projection: { _id: 1 } }),
    ]);
    // Keep real history accessible to other users; the demo view still shows only the pump.
    if (document || realWork) { preservedMachinesWithRecords++; continue; }
    const result = await machines.updateOne({ assetCode, seedKey: `arture-demo-machine-${assetCode}-v1`, archivedAt: null }, {
      $set: { archivedAt: now, updatedAt: now },
    });
    archivedMachines += result.modifiedCount;
  }
  const logs = await db.collection("arture_maintenance_logs").updateMany({ seedKey: { $in: oldLogKeys }, archivedAt: null }, {
    $set: { archivedAt: now },
  });
  return { archivedMachines, archivedSampleLogs: logs.modifiedCount, preservedMachinesWithRecords, assetCode: waterPump.assetCode };
}
