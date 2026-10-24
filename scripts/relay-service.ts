import { closeArtureDb, getArtureDb } from "../src/lib/db";
import { knowledgeOptions, startKnowledgeWorker } from "../src/lib/knowledge";
import { startRealtimeRelay } from "../src/lib/realtime-relay";

async function main() {
  const db = await getArtureDb();
  const knowledge = knowledgeOptions();
  const worker = await startKnowledgeWorker(db, knowledge);
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

main().catch(() => {
  console.error("Arture relay service failed to start. Check its MongoDB, OpenAI, relay, and knowledge configuration.");
  process.exitCode = 1;
});
