import { ObjectId } from "mongodb";
import { closeArtureDb, getArtureDb } from "../src/lib/db";
import { validateArtureEnvironment } from "../src/lib/env";
import { artureCollectionNames } from "../src/lib/repositories";
import { artureDemoMachines, artureDemoMaintenance, artureDemoTechnicians } from "../src/lib/sample-data";

function enabled(value: string | undefined) {
  return value === "true";
}

async function main() {
  const environment = validateArtureEnvironment();
  if (!enabled(process.env.ARTURE_SEED_SAMPLE_DATA)) {
    throw new Error("Set ARTURE_SEED_SAMPLE_DATA=true to add Arture demo sample data.");
  }

  const db = await getArtureDb();
  const machineCollection = db.collection(artureCollectionNames.machines);
  const technicianCollection = db.collection(artureCollectionNames.technicians);
  const logCollection = db.collection(artureCollectionNames.logs);
  const now = new Date();

  for (const machine of artureDemoMachines) {
    await machineCollection.updateOne(
      { assetCode: machine.assetCode },
      { $setOnInsert: { ...machine, seedKey: `arture-demo-machine-${machine.assetCode}-v1`, archivedAt: null, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
  }

  for (const technician of artureDemoTechnicians) {
    await technicianCollection.updateOne(
      { name: technician.name },
      { $setOnInsert: { ...technician, seedKey: `arture-demo-technician-${technician.name.toLowerCase().replaceAll(" ", "-")}-v1`, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
  }

  for (const log of artureDemoMaintenance) {
    const machine = await machineCollection.findOne({ assetCode: log.assetCode, seedKey: `arture-demo-machine-${log.assetCode}-v1` });
    const technician = await technicianCollection.findOne({ name: log.technicianName, seedKey: `arture-demo-technician-${log.technicianName.toLowerCase().replaceAll(" ", "-")}-v1` });
    if (!machine?._id || !technician?._id) continue;
    await logCollection.updateOne(
      { seedKey: log.seedKey },
      { $setOnInsert: { machineId: machine._id as ObjectId, technicianId: technician._id as ObjectId, technicianName: technician.name, serviceDate: log.serviceDate, minutesSpent: log.minutesSpent, notes: log.notes, seedKey: log.seedKey, createdAt: now } },
      { upsert: true },
    );
  }

  console.log(`Arture sample data ensured in ${environment.mongodbDatabase}; existing records were not changed.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(closeArtureDb);
