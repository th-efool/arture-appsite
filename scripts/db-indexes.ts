import { ensureConversationIndexes } from "../src/lib/conversation-recorder";
import { ensureKnowledgeIndexes, knowledgeOptions } from "../src/lib/knowledge";
import { closeArtureDb, getArtureDb } from "../src/lib/db";
import { artureCollectionNames } from "../src/lib/repositories";

async function main() {
  const db = await getArtureDb();
  await ensureConversationIndexes(db);
  const knowledge = knowledgeOptions();
  await ensureKnowledgeIndexes(db, knowledge.mode === "vector" && knowledge.vectorBackend !== "local");
  await Promise.all([
    db.collection("arture_app_connections").createIndex({ connectionId: 1 }, { unique: true, sparse: true }),
    db.collection("arture_app_connections").createIndex({ assetCode: 1, lastSeenAt: -1 }),
    db.collection(artureCollectionNames.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(artureCollectionNames.sessions).createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection(artureCollectionNames.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(artureCollectionNames.machines).createIndex({ assetCode: 1 }, { unique: true }),
    db.collection(artureCollectionNames.machines).createIndex({ seedKey: 1 }, { unique: true, sparse: true }),
    db.collection(artureCollectionNames.machines).createIndex({ status: 1, archivedAt: 1 }),
    db.collection(artureCollectionNames.technicians).createIndex({ active: 1, name: 1 }),
    db.collection(artureCollectionNames.technicians).createIndex({ seedKey: 1 }, { unique: true, sparse: true }),
    db.collection(artureCollectionNames.logs).createIndex({ machineId: 1, serviceDate: -1 }),
    db.collection(artureCollectionNames.logs).createIndex({ seedKey: 1 }, { unique: true, sparse: true }),
    db.collection(artureCollectionNames.documents).createIndex({ machineId: 1, createdAt: -1 }),
    db.collection(artureCollectionNames.activity).createIndex({ createdAt: -1 }),
  ]);
  console.log(`Indexes ensured for ${db.databaseName}.`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(closeArtureDb);
