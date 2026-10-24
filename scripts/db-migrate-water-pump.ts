import { closeArtureDb, getArtureDb } from "../src/lib/db";
import { migrateWaterPump } from "../src/lib/migrate-water-pump";

async function main() {
  const db = await getArtureDb();
  console.log(JSON.stringify(await migrateWaterPump(db)));
}
main().catch(() => { console.error("Water pump migration failed. Check Arture configuration and asset ownership."); process.exitCode = 1; }).finally(closeArtureDb);
