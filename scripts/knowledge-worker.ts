import { closeArtureDb, getArtureDb } from "../src/lib/db";
import { knowledgeOptions, startKnowledgeWorker } from "../src/lib/knowledge";

async function main() {
  const worker = await startKnowledgeWorker(await getArtureDb(), knowledgeOptions());
  console.log("Arture document worker is running.");
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await worker.close(); await closeArtureDb(); };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}
main().catch(async () => { console.error("Document worker could not start. Check database access and Atlas index permissions, or use ARTURE_KNOWLEDGE_MODE=keyword for local MongoDB."); await closeArtureDb(); process.exitCode = 1; });
