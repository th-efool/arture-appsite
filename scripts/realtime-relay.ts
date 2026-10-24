import { getArtureDb, closeArtureDb } from "../src/lib/db";
import { startRealtimeRelay } from "../src/lib/realtime-relay";

async function main() {
  const relay = await startRealtimeRelay({ db: await getArtureDb(), apiKey: process.env.ARTURE_OPENAI_API_KEY ?? "", accessKey: process.env.ARTURE_RELAY_ACCESS_KEY ?? "", model: process.env.ARTURE_REALTIME_MODEL, port: Number(process.env.ARTURE_RELAY_PORT ?? 3101) });
  console.log(`Arture voice relay listening on port ${relay.port}.`);
  const stop = async () => { await relay.close(); await closeArtureDb(); };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}
main().catch(() => { console.error("Arture voice relay failed to start. Check its configuration, database, and port."); process.exitCode = 1; });
