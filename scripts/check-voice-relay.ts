import WebSocket from "ws";
import { waterPump } from "../src/lib/demo-machine";

async function main() {
  const url = new URL(process.env.ARTURE_RELAY_URL ?? "ws://127.0.0.1:3101/realtime");
  url.searchParams.set("assetCode", waterPump.assetCode);
  const key = process.env.ARTURE_RELAY_ACCESS_KEY;
  if (!key) throw new Error("Configure ARTURE_RELAY_ACCESS_KEY first.");
  const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${key}` }, handshakeTimeout: 15000 });
  let audioBytes = 0;
  let configured = false;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { ws.terminate(); reject(new Error("Voice check timed out.")); }, 45000);
    const fail = (message: string) => { clearTimeout(timeout); ws.terminate(); reject(new Error(message)); };
    ws.on("error", () => fail("Relay transport failed. Check server configuration."));
    ws.on("close", () => { if (!audioBytes) fail("Relay closed before returning voice audio."); });
    ws.on("message", raw => {
      const event = JSON.parse(raw.toString());
      if (event.type === "error") { fail(`OpenAI rejected the check: ${event.error?.code ?? event.error?.type ?? "unknown"}.`); return; }
      if (event.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: { type: "realtime", instructions: "This is a synthetic connection check. Say exactly: Arture relay ready.", audio: { input: { format: { type: "audio/pcm", rate: 24000 }, turn_detection: null }, output: { format: { type: "audio/pcm", rate: 24000 }, voice: "alloy" } } } }));
      }
      if (event.type === "session.updated" && !configured) {
        configured = true;
        ws.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: "Run the connection check now." }] } }));
        ws.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["audio"] } }));
      }
      if (["response.output_audio.delta", "response.audio.delta"].includes(event.type)) audioBytes += Buffer.from(event.delta, "base64").length;
      if (event.type === "response.done") {
        clearTimeout(timeout);
        if (event.response?.status !== "completed" || !audioBytes) {
          const details = event.response?.status_details;
          fail(`Voice response ${event.response?.status ?? "unknown"}: ${details?.error?.code ?? details?.error?.type ?? details?.reason ?? "no_audio"}.`);
          return;
        }
        console.log(`Real OpenAI voice response received through Arture: ${audioBytes} PCM audio bytes.`);
        // An optional short hold allows the website's heartbeat indicator to be inspected.
        if (process.argv.includes("--hold")) setTimeout(() => { ws.close(); resolve(); }, 12000);
        else { ws.close(); resolve(); }
      }
    });
  });
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Voice check failed."); process.exitCode = 1; });
