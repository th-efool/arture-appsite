import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { MongoClient, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import WebSocket, { WebSocketServer } from "ws";
import { startRealtimeRelay } from "../src/lib/realtime-relay";
import { getAppConnections } from "../src/lib/app-connections";
import { getConversation } from "../src/lib/conversations";
import { waterPump } from "../src/lib/demo-machine";
import { ensureKnowledgeIndexes, processKnowledgeJob, queuedKnowledge } from "../src/lib/knowledge";
import { knowledgeToolName } from "../src/lib/realtime-knowledge";
import { GridFSBucket } from "mongodb";
import { textPdf } from "./pdf-fixture";

const appKey = "arture-test-device-credential-32-characters";
const providerKey = "provider-key-only-visible-on-server";
let mongo: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;
let dbSequence = 0;
before(async () => {
  const binary = resolve(".arture-test-mongo/mongod.exe");
  mongo = await MongoMemoryServer.create({ binary: existsSync(binary) ? { systemBinary: binary } : undefined });
  mongoClient = new MongoClient(mongo.getUri());
});
after(async () => { await mongoClient?.close(); await mongo?.stop(); });

async function waitUntil(check: () => boolean | Promise<boolean>, message: string) {
  for (let i = 0; i < 200; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.fail(message);
}
async function prepare() {
  db = mongoClient.db(`arture_relay_test_${++dbSequence}`);
  await db.collection("arture_machines").insertOne({ ...waterPump, archivedAt: null });
  const received: Record<string, unknown>[] = [];
  const headers: { authorization?: string; url?: string }[] = [];
  const upstream = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>(resolve => upstream.once("listening", resolve));
  upstream.on("connection", (ws, request) => {
    headers.push({ authorization: request.headers.authorization, url: request.url });
    ws.send(JSON.stringify({ type: "session.created", session: { id: "provider-session" } }));
    ws.on("message", raw => {
      const event = JSON.parse(raw.toString());
      received.push(event);
      if (event.type === "conversation.item.create" && event.item?.type === "message" && event.item.id) assert.ok(event.item.id.length <= 32, "OpenAI message IDs must fit the provider limit");
      if (event.type === "session.update") ws.send(JSON.stringify({ type: "session.updated", session: event.session }));
      if (event.type === "conversation.item.delete") ws.send(JSON.stringify({ type: "error", error: { code: "invalid_api_key", message: "Invalid synthetic provider credential." } }));
      if (event.type === "input_audio_buffer.append") ws.send(JSON.stringify({ type: "response.output_audio.delta", delta: event.audio }));
      if (event.type === "response.create") {
        ws.send(JSON.stringify({ type: "response.output_item.added", item: { type: "function_call", call_id: "pump-call", name: "Machine_ShowAnswer" } }));
        ws.send(JSON.stringify({ type: "response.function_call_arguments.delta", call_id: "pump-call", delta: JSON.stringify({ component: "Impeller", answer: "Moves water." }) }));
        ws.send(JSON.stringify({ type: "response.output_item.done", item: { type: "function_call", call_id: "pump-call", name: "Machine_ShowAnswer" } }));
        ws.send(JSON.stringify({ type: "response.done", response: { status: "completed" } }));
      }
    });
  });
  return {
    upstream, received, headers,
    upstreamUrl: `ws://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
    async close() { for (const client of upstream.clients) client.terminate(); await new Promise<void>(resolve => upstream.close(() => resolve())); },
  };
}
function openClient(port: number, key = appKey, assetCode = waterPump.assetCode) {
  const events: Record<string, unknown>[] = [];
  const client = new WebSocket(`ws://127.0.0.1:${port}/realtime?assetCode=${assetCode}`, { headers: { Authorization: `Bearer ${key}` } });
  client.on("message", raw => events.push(JSON.parse(raw.toString())));
  client.on("error", () => {});
  return { client, events };
}
async function rejectedStatus(port: number, key: string, assetCode = waterPump.assetCode) {
  const { client } = openClient(port, key, assetCode);
  return new Promise<number>(resolve => { client.once("unexpected-response", (_request, response) => { response.resume(); client.terminate(); resolve(response.statusCode!); }); });
}

test("voice grounding searches a real uploaded PDF, hides server tools, resumes AR calls and saves source history", { timeout: 30000 }, async () => {
  const mock = await prepare();
  const machine = (await db.collection("arture_machines").findOne({ assetCode: waterPump.assetCode }))!;
  await ensureKnowledgeIndexes(db);
  const file = new GridFSBucket(db, { bucketName: "arture_documents" }).openUploadStream("Pump verification.pdf");
  await new Promise<void>((resolve, reject) => { file.on("finish", resolve); file.on("error", reject); file.end(textPdf(["Impeller verification reference for this test."])); });
  await db.collection("arture_document_records").insertOne({ machineId: machine._id, gridFsFileId: file.id, originalName: "Pump verification.pdf", mimeType: "application/pdf", createdAt: new Date(), knowledge: queuedKnowledge() });
  await processKnowledgeJob(db, { mode: "keyword" });
  mock.upstream.removeAllListeners("connection");
  let returnedSources: { sources: { page: number; originalName: string }[] } | undefined;
  mock.upstream.on("connection", ws => {
    ws.send(JSON.stringify({ type: "session.created" }));
    ws.on("message", raw => {
      const event = JSON.parse(raw.toString()); mock.received.push(event);
      if (event.type === "session.update") ws.send(JSON.stringify({ type: "session.updated" }));
      if (event.type === "conversation.item.create" && event.item.type === "function_call_output" && event.item.call_id === "retrieval") returnedSources = JSON.parse(event.item.output);
      if (event.type === "response.create") {
        if (event.response.tool_choice?.name === knowledgeToolName) {
          const item = { type: "function_call", name: knowledgeToolName, call_id: "retrieval", arguments: JSON.stringify({ query: "impeller" }) };
          ws.send(JSON.stringify({ type: "response.created", response: { id: "search" } }));
          ws.send(JSON.stringify({ type: "response.output_item.added", item }));
          ws.send(JSON.stringify({ ...item, type: "response.function_call_arguments.done" }));
          ws.send(JSON.stringify({ type: "response.done", response: { id: "search", status: "completed", output: [item] } }));
        } else {
          assert.equal(returnedSources?.sources[0].page, 1);
          ws.send(JSON.stringify({ type: "response.created", response: { id: "answer" } }));
          ws.send(JSON.stringify({ type: "response.output_item.added", item: { type: "function_call", call_id: "ar", name: "Machine_ShowAnswer" } }));
          ws.send(JSON.stringify({ type: "response.output_item.done", item: { type: "function_call", call_id: "ar", name: "Machine_ShowAnswer", arguments: JSON.stringify({ component: "Impeller", answer: "Pump verification.pdf, page 1." }) } }));
          ws.send(JSON.stringify({ type: "response.output_audio_transcript.done", response_id: "answer", item_id: "spoken", transcript: "According to Pump verification.pdf, page 1, this is the impeller reference." }));
          ws.send(JSON.stringify({ type: "response.output_audio.delta", delta: Buffer.from([0, 0]).toString("base64") }));
          ws.send(JSON.stringify({ type: "response.done", response: { id: "answer", status: "completed", output: [] } }));
        }
      }
    });
  });
  const relay = await startRealtimeRelay({ db, apiKey: providerKey, accessKey: appKey, upstreamUrl: mock.upstreamUrl, port: 0, knowledge: { mode: "keyword" } });
  const { client, events } = openClient(relay.port);
  try {
    await waitUntil(() => events.some(e => e.type === "session.created"), "Provider did not connect");
    client.send(JSON.stringify({ type: "session.update", session: { instructions: "Use AR tools", tools: [{ type: "function", name: "Machine_ShowAnswer" }] } }));
    await waitUntil(() => events.some(e => e.type === "session.updated"), "Session did not configure");
    client.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: "Explain impeller" }] } }));
    client.send(JSON.stringify({ type: "response.create" }));
    await waitUntil(() => events.some(e => e.type === "response.output_audio.delta"), "Grounded answer did not resume");
    assert.ok(events.some(e => e.type === "arture.knowledge" && e.status === "retrieved"));
    assert.ok(!events.some(e => e.type === "response.function_call_arguments.done" && e.name === knowledgeToolName));
    assert.ok(events.some(e => e.type === "response.output_item.done" && (e.item as { name: string }).name === "Machine_ShowAnswer"));
    client.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: "ar", output: JSON.stringify({ highlighted: true, uiDisplayed: true }) } }));
    client.send(JSON.stringify({ type: "arture.session.end" }));
    await waitUntil(async () => !!await db.collection("arture_conversations").findOne({ status: "completed" }), "Grounded session did not persist");
    const session = (await db.collection("arture_conversations").findOne({ status: "completed" }))!;
    const detail = (await getConversation(db, session.conversationId))!;
    const evidence = detail.events.find(e => e.kind === "knowledge")!;
    assert.equal(evidence.status, "retrieved"); assert.equal(evidence.sources![0].originalName, "Pump verification.pdf");
    assert.equal(detail.session.toolCount, 1); assert.ok(detail.events.some(e => e.role === "assistant" && e.text?.includes("page 1")));
  } finally { client.terminate(); await relay.close(); await mock.close(); }
});

test("authenticated relay forwards audio, AR tools, cancellation and reconnects without exposing the provider key", { timeout: 30000 }, async () => {
  const mock = await prepare();
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: providerKey, upstreamUrl: mock.upstreamUrl, port: 0, heartbeatMs: 50 });
  const { client, events } = openClient(relay.port);
  let second: WebSocket | undefined;
  try {
    await waitUntil(() => events.some(event => event.type === "session.created"), "Provider session did not reach Unity client");
    client.send(JSON.stringify({ type: "session.update", session: { model: "untrusted-client-model", instructions: "Explain the pump.", tools: [{ type: "function", name: "Machine_ShowAnswer", parameters: { type: "object" } }], audio: { input: { format: { type: "audio/pcm", rate: 24000 }, turn_detection: { type: "server_vad", create_response: false } } } } }));
    await waitUntil(async () => (await getAppConnections(db, [waterPump.assetCode]))[waterPump.assetCode].state === "connected", "Session not reported connected after configuration");
    assert.equal(mock.headers[0].authorization, `Bearer ${providerKey}`);
    assert.match(mock.headers[0].url!, /model=gpt-realtime-2.1-mini/);
    assert.ok(!JSON.stringify(events).includes(providerKey));
    const configured = mock.received.find(event => event.type === "session.update")!;
    assert.equal((configured.session as { model?: string }).model, undefined);
    assert.match((configured.session as { instructions: string }).instructions, /ATR-DEMO-PUMP-001/);
    const audio = Buffer.from([0, 1, 127, 255, 128, 0]).toString("base64");
    client.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
    await waitUntil(() => events.some(event => event.type === "response.output_audio.delta" && event.delta === audio), "Audio changed or was not forwarded");
    client.send(JSON.stringify({ type: "response.create" }));
    await waitUntil(() => events.some(event => event.type === "response.output_item.done"), "AR tool call did not reach client");
    const output = JSON.stringify({ highlighted: true, uiDisplayed: true });
    client.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: "pump-call", output } }));
    client.send(JSON.stringify({ type: "response.cancel" }));
    await waitUntil(() => mock.received.some(event => event.type === "response.cancel"), "Cancellation did not reach provider");
    assert.equal((mock.received.find(event => event.type === "conversation.item.create")!.item as { output: string }).output, output);
    for (const event_id of ["stable-message-event", undefined]) client.send(JSON.stringify({ type: "conversation.item.create", event_id, item: { type: "message", role: "user", content: [{ type: "input_text", text: "Check pump connection." }] } }));
    await waitUntil(() => mock.received.filter(event => event.type === "conversation.item.create" && (event.item as { type: string }).type === "message").length === 2, "Generated message IDs were not forwarded");
    client.close();
    await waitUntil(async () => (await getAppConnections(db, [waterPump.assetCode]))[waterPump.assetCode].state === "disconnected", "Disconnect not recorded");
    const reconnect = openClient(relay.port); second = reconnect.client;
    await waitUntil(() => reconnect.events.some(event => event.type === "session.created"), "Reconnect failed");
    second.send(JSON.stringify({ type: "session.update", session: {} }));
    await waitUntil(async () => (await getAppConnections(db, [waterPump.assetCode]))[waterPump.assetCode].state === "connected", "Reconnected app is not live");
    assert.equal(await db.collection("arture_app_connections").countDocuments(), 2);
    // Each authenticated connection has its own saved conversation.
    assert.equal(await db.collection("arture_conversations").countDocuments(), 2);
  } finally { client.terminate(); second?.terminate(); await relay.close(); await mock.close(); }
});

test("invalid app credentials and machine IDs are rejected before opening a provider connection", { timeout: 15000 }, async () => {
  const mock = await prepare();
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: providerKey, upstreamUrl: mock.upstreamUrl, port: 0 });
  try {
    assert.equal(await rejectedStatus(relay.port, "wrong-key"), 401);
    assert.equal(await rejectedStatus(relay.port, appKey, "ATR-OTHER"), 403);
    assert.equal(mock.headers.length, 0);
    assert.equal(await db.collection("arture_app_connections").countDocuments(), 0);
  } finally { await relay.close(); await mock.close(); }
});

test("a missing OpenAI key produces an honest unconfigured relay", { timeout: 15000 }, async () => {
  const mock = await prepare();
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: "", upstreamUrl: mock.upstreamUrl, port: 0 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${relay.port}/health`)).status, 503);
    assert.equal(await rejectedStatus(relay.port, appKey), 503);
    assert.equal(mock.headers.length, 0);
  } finally { await relay.close(); await mock.close(); }
});

test("a stalled client loses connected status and stale database heartbeats never remain live", { timeout: 15000 }, async () => {
  const mock = await prepare();
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: providerKey, upstreamUrl: mock.upstreamUrl, port: 0, heartbeatMs: 40, timeoutMs: 180 });
  const client = new WebSocket(`ws://127.0.0.1:${relay.port}/realtime?assetCode=${waterPump.assetCode}`, { headers: { Authorization: `Bearer ${appKey}` }, autoPong: false });
  client.on("error", () => {});
  try {
    await waitUntil(async () => !!await db.collection("arture_app_connections").findOne({ state: "error", errorCode: "heartbeat_timeout" }), "Dead client was not cleaned up");
    await db.collection("arture_app_connections").insertOne({ assetCode: "ATR-STALE", state: "connected", lastSeenAt: new Date(Date.now() - 60000), endedAt: null });
    assert.equal((await getAppConnections(db, ["ATR-STALE"]))["ATR-STALE"].state, "disconnected");
  } finally { client.terminate(); await relay.close(); await mock.close(); }
});

test("provider failure closes the app socket and records a useful error without storing credentials", { timeout: 15000 }, async () => {
  await prepare().then(mock => mock.close());
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: providerKey, upstreamUrl: "ws://127.0.0.1:1", port: 0 });
  const { client } = openClient(relay.port);
  try {
    await waitUntil(async () => !!await db.collection("arture_app_connections").findOne({ state: "error", errorCode: "openai_connection_failed" }), "Provider failure was not persisted");
    const records = await db.collection("arture_app_connections").find({}).toArray();
    assert.ok(!JSON.stringify(records).includes(providerKey));
    assert.ok(!JSON.stringify(records).includes(appKey));
  } finally { client.terminate(); await relay.close(); }
});


test("OpenAI credential rejection becomes an error status rather than a false live session", { timeout: 15000 }, async () => {
  const mock = await prepare();
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: providerKey, upstreamUrl: mock.upstreamUrl, port: 0 });
  const { client, events } = openClient(relay.port);
  try {
    await waitUntil(() => events.some(event => event.type === "session.created"), "No provider session");
    client.send(JSON.stringify({ type: "session.update", session: {} }));
    await waitUntil(async () => (await getAppConnections(db, [waterPump.assetCode]))[waterPump.assetCode].state === "connected", "Session setup did not finish");
    client.send(JSON.stringify({ type: "conversation.item.delete", item_id: "force-test-error" }));
    await waitUntil(async () => !!await db.collection("arture_app_connections").findOne({ state: "error", errorCode: "openai_invalid_api_key" }), "Provider rejection was hidden");
    assert.equal((await getAppConnections(db, [waterPump.assetCode]))[waterPump.assetCode].state, "error");
  } finally { client.terminate(); await relay.close(); await mock.close(); }
});


test("Unity session lifecycle and worker identity produce a durable transcript and tool history", { timeout: 20000 }, async () => {
  const mock = await prepare();
  await db.collection("arture_technicians").insertOne({ name: "Asha Mehta", phone: "+91 90000 00001", active: true });
  const relay = await startRealtimeRelay({ knowledge: false, db, accessKey: appKey, apiKey: providerKey, upstreamUrl: mock.upstreamUrl, port: 0, heartbeatMs: 50 });
  const { client, events } = openClient(relay.port);
  try {
    await waitUntil(() => events.some(event => event.type === "session.created"), "No provider session");
    client.send(JSON.stringify({ type: "arture.identify", phone: "+91 90000 00001" }));
    await waitUntil(() => events.some(event => event.type === "arture.worker" && event.matched === true), "Worker was not matched");
    client.send(JSON.stringify({ type: "session.update", session: {} }));
    const provider = [...mock.upstream.clients][0];
    const emit = (event: object) => provider.send(JSON.stringify(event));
    emit({ type: "input_audio_buffer.committed", item_id: "user-voice-turn" });
    emit({ type: "response.created", response: { id: "voice-response" } });
    emit({ type: "response.output_item.added", response_id: "voice-response", item: { type: "function_call", call_id: "highlight", name: "Machine_ShowAnswer" } });
    emit({ type: "response.output_item.done", response_id: "voice-response", item: { type: "function_call", call_id: "highlight", name: "Machine_ShowAnswer", arguments: JSON.stringify({ component: "Impeller", answer: "Moves water." }) } });
    await waitUntil(() => events.some(event => event.type === "response.output_item.done"), "Tool not received");
    client.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: "highlight", output: JSON.stringify({ highlighted: true, uiDisplayed: true }) } }));
    emit({ type: "response.output_audio_transcript.done", response_id: "voice-response", item_id: "assistant-voice-turn", transcript: "The impeller moves water." });
    emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "user-voice-turn", transcript: "What does the impeller do?" });
    await waitUntil(async () => await db.collection("arture_conversation_events").countDocuments({ kind: "transcript", status: "completed" }) === 2, "Final transcripts not saved");
    client.send(JSON.stringify({ type: "arture.session.end" }));
    await waitUntil(async () => !!await db.collection("arture_conversations").findOne({ status: "completed" }), "Explicit completion not saved");
    const record = (await db.collection("arture_conversations").findOne({ status: "completed" }))!;
    const saved = (await getConversation(db, record.conversationId))!;
    assert.equal(saved.session.worker?.name, "Asha Mehta");
    assert.equal(saved.session.endReason, "app_completed");
    assert.equal(saved.session.transcriptCount, 2);
    assert.equal(saved.session.toolCount, 1);
    assert.equal(saved.events[0].role, "user");
    assert.equal(saved.events.find(event => event.kind === "tool")?.status, "succeeded");
    assert.ok(!mock.received.some(event => event.type === "arture.identify" || event.type === "arture.session.end"));
    const serialized = JSON.stringify(await db.collection("arture_conversations").find({}).toArray());
    assert.ok(!serialized.includes(providerKey));
    assert.ok(!serialized.includes(appKey));
    assert.ok(!serialized.includes("90000"));
  } finally { client.terminate(); await relay.close(); await mock.close(); }
});
