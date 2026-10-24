import { closeArtureDb, getArtureDb } from "../src/lib/db";
import { knowledgeOptions, startKnowledgeWorker } from "../src/lib/knowledge";
import { startRealtimeRelay } from "../src/lib/realtime-relay";

if (!process.env.ARTURE_APP_URL) process.env.ARTURE_APP_URL = "http://localhost:3100";
if (!process.env.ARTURE_AUTH_SECRET) process.env.ARTURE_AUTH_SECRET = "arture-relay-standalone-secret";

async function main() {
  const db = await getArtureDb();
  const knowledge = knowledgeOptions();
  let worker = { close: async () => {} };
  try {
    worker = await startKnowledgeWorker(db, knowledge);
    console.log("Arture knowledge worker started successfully.");
  } catch (error) {
    console.warn("Knowledge worker note:", error);
  }

  const relay = await startRealtimeRelay({
    db,
    apiKey: process.env.ARTURE_OPENAI_API_KEY ?? "",
    accessKey: process.env.ARTURE_RELAY_ACCESS_KEY ?? "",
    model: process.env.ARTURE_REALTIME_MODEL,
    // Render, Railway and most container platforms provide PORT.
    port: Number(process.env.PORT ?? process.env.ARTURE_RELAY_PORT ?? 3101),
    knowledge,
  });
  console.log(`Arture voice relay and knowledge worker listening on port ${relay.port}.`);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await relay.close();
    await worker.close();
    await closeArtureDb();
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}

main().catch(error => {
  console.error("Arture relay service failed to start:", error);
  process.exitCode = 1;
});
