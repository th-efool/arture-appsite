import WebSocket from "ws";
import { waterPump } from "../src/lib/demo-machine";

async function main() {
  const question = process.env.ARTURE_KNOWLEDGE_CHECK_QUESTION ?? "What do the uploaded manuals say about the impeller? Cite the filename and page.";
  const expected = process.env.ARTURE_KNOWLEDGE_CHECK_EXPECT;
  const key = process.env.ARTURE_RELAY_ACCESS_KEY;
  if (!key) throw new Error("Configure ARTURE_RELAY_ACCESS_KEY.");
  const url = new URL(process.env.ARTURE_RELAY_URL ?? "ws://127.0.0.1:3101/realtime"); url.searchParams.set("assetCode", waterPump.assetCode);
  const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${key}` }, handshakeTimeout: 15000 });
  let audioBytes = 0; let transcript = ""; let configured = false;
  let retrieval: { status: string; sources: { originalName: string; page: number }[] } | undefined;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { ws.terminate(); reject(new Error("Grounded voice check timed out.")); }, 75_000);
    const fail = (message: string) => { clearTimeout(timer); ws.terminate(); reject(new Error(message)); };
    ws.on("error", () => fail("Relay transport failed."));
    ws.on("close", () => { if (!audioBytes) fail("Relay closed before the answer."); });
    ws.on("message", raw => {
      const event = JSON.parse(raw.toString());
      if (event.type === "error") return fail(`Provider rejected the check (${event.error?.code ?? "unknown"}).`);
      if (event.type === "session.created") ws.send(JSON.stringify({ type: "session.update", session: { type: "realtime", instructions: "This is a document-grounding verification. Answer the user's question concisely, using the retrieved evidence and citing the source filename and page.", audio: { input: { format: { type: "audio/pcm", rate: 24000 }, turn_detection: null }, output: { format: { type: "audio/pcm", rate: 24000 }, voice: "alloy" } } } }));
      if (event.type === "session.updated" && !configured) {
        configured = true;
        ws.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: question }] } }));
        ws.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["audio"] } }));
      }
      if (event.type === "arture.knowledge" && event.status !== "searching") retrieval = event;
      if (["response.output_audio.delta", "response.audio.delta"].includes(event.type)) audioBytes += Buffer.from(event.delta, "base64").length;
      if (["response.output_audio_transcript.done", "response.audio_transcript.done"].includes(event.type)) transcript = event.transcript;
      if (event.type === "response.done") {
        if (event.response?.status !== "completed" || !audioBytes) return fail("Voice response did not complete with audio.");
        if (!retrieval) return fail("No retrieval status was received.");
        if (!process.argv.includes("--allow-no-sources") && retrieval.status !== "retrieved") return fail(`No supporting passages (${retrieval.status}). Upload a text PDF and wait for Ready.`);
        if (expected && !transcript.toLowerCase().includes(expected.toLowerCase())) return fail("The answer did not contain the expected verification fact.");
        clearTimeout(timer);
        console.log(JSON.stringify({ audioBytes, retrievalStatus: retrieval.status, sources: retrieval.sources, transcript }, null, 2));
        ws.send(JSON.stringify({ type: "arture.session.end" })); ws.close(); resolve();
      }
    });
  });
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Grounded voice check failed."); process.exitCode = 1; });
