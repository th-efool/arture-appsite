import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ConversationRecorder, ensureConversationIndexes } from "../src/lib/conversation-recorder";
import { getConversation, listConversations } from "../src/lib/conversations";

let mongo: MongoMemoryServer;
let client: MongoClient;
let sequence = 0;
before(async () => {
  const binary = resolve(".arture-test-mongo/mongod.exe");
  mongo = await MongoMemoryServer.create({ binary: existsSync(binary) ? { systemBinary: binary } : undefined });
  client = new MongoClient(mongo.getUri());
});
after(async () => { await client?.close(); await mongo?.stop(); });
async function setup() {
  const db = client.db(`arture_conversation_test_${++sequence}`);
  await ensureConversationIndexes(db);
  const machine = { _id: new ObjectId(), name: "Centrifugal Water Pump", assetCode: "ATR-DEMO-PUMP-001" };
  const id = randomUUID();
  const recorder = new ConversationRecorder(db, id, machine, "gpt-realtime-2.1-mini", () => assert.fail("Recorder storage failed"));
  return { db, machine, id, recorder };
}

test("late transcripts retain turn order, duplicate events do not repeat text, and actual tool results are preserved", async () => {
  const { db, machine, id, recorder } = await setup();
  recorder.provider({ type: "session.updated" });
  recorder.provider({ type: "input_audio_buffer.committed", item_id: "user-1" });
  recorder.provider({ type: "response.created", response: { id: "response-1" } });
  recorder.provider({ type: "response.output_item.added", response_id: "response-1", item: { type: "function_call", call_id: "call-1", name: "Machine_ShowAnswer" } });
  recorder.provider({ type: "response.function_call_arguments.done", call_id: "call-1", name: "Machine_ShowAnswer", arguments: JSON.stringify({ component: "Impeller", answer: "Moves water." }) });
  const result = { type: "conversation.item.create", item: { type: "function_call_output", call_id: "call-1", output: JSON.stringify({ highlighted: true, uiDisplayed: false, uiError: "Label unavailable", accessToken: "must-not-be-saved" }) } };
  recorder.client(result); recorder.client(result);
  recorder.provider({ type: "response.output_item.added", response_id: "response-1", item: { type: "message", role: "assistant", id: "assistant-1" } });
  const delta = { type: "response.output_audio_transcript.delta", event_id: "delta-1", response_id: "response-1", item_id: "assistant-1", delta: "The impeller moves water." };
  recorder.provider(delta); recorder.provider(delta);
  recorder.heartbeat();
  await recorder.flush();
  assert.equal((await getConversation(db, id))!.events[2].text, "The impeller moves water.");
  const done = { type: "response.output_audio_transcript.done", response_id: "response-1", item_id: "assistant-1", transcript: "The impeller moves water." };
  recorder.provider(done); recorder.provider(done);
  recorder.provider({ type: "conversation.item.input_audio_transcription.completed", item_id: "user-1", transcript: "What does the impeller do?" });
  recorder.provider({ type: "response.done", response: { id: "response-1", status: "completed", output: [{ type: "message", role: "assistant", id: "assistant-1", content: [{ type: "audio", transcript: "The impeller moves water." }] }] } });
  recorder.client({ type: "input_audio_buffer.append", audio: "audio-must-not-be-saved" });
  recorder.provider({ type: "response.output_audio.delta", delta: "audio-must-not-be-saved" });
  recorder.finish("completed", "app_completed"); await recorder.flush();
  const detail = (await getConversation(db, id))!;
  assert.equal(detail.session.status, "completed");
  assert.equal(detail.session.transcriptCount, 2);
  assert.equal(detail.session.toolCount, 1);
  assert.deepEqual(detail.events.map(event => event.kind), ["transcript", "tool", "transcript"]);
  assert.equal(detail.events[0].text, "What does the impeller do?");
  assert.equal(detail.events[1].status, "partial");
  assert.equal(detail.events[1].component, "Impeller");
  assert.equal((detail.events[1].result as { highlighted: boolean }).highlighted, true);
  const raw = JSON.stringify(await db.collection("arture_conversation_events").find({}).toArray());
  assert.ok(!raw.includes("must-not-be-saved"));
  assert.ok(!raw.includes("argumentBuffer"));
  assert.equal((await listConversations(db, machine._id.toHexString())).sessions[0].id, id);
});

test("interrupted answers, failed transcription and provider failures remain explicit in saved history", async () => {
  const { db, id, recorder } = await setup();
  recorder.provider({ type: "response.created", response: { id: "cancelled-response" } });
  recorder.provider({ type: "response.output_audio_transcript.delta", item_id: "answer", response_id: "cancelled-response", delta: "First isolate the" });
  recorder.client({ type: "response.cancel", response_id: "cancelled-response" });
  recorder.provider({ type: "conversation.item.input_audio_transcription.failed", item_id: "user", error: { code: "transcription_failed" } });
  recorder.provider({ type: "error", event_id: "error-1", error: { code: "invalid_api_key", message: "Do not persist raw provider error payloads or credentials" } });
  recorder.finish("failed", "openai_invalid_api_key"); await recorder.flush();
  const detail = (await getConversation(db, id))!;
  assert.equal(detail.session.status, "failed");
  assert.equal(detail.events[0].status, "interrupted");
  assert.equal(detail.events[0].text, "First isolate the");
  assert.equal(detail.events[1].status, "failed");
  assert.equal(detail.events[2].code, "invalid_api_key");
  assert.ok(!JSON.stringify(detail).includes("raw provider error"));
});

test("worker matching uses a unique active directory record and cannot relabel an already matched session", async () => {
  const { db, id, recorder } = await setup();
  await db.collection("arture_technicians").insertMany([
    { name: "Asha Mehta", phone: "+91 90000 00001", active: true },
    { name: "Other Worker", phone: "+91 90000 00002", active: true },
    { name: "Duplicate One", phone: "+91 90000 00003", active: true },
    { name: "Duplicate Two", phone: "9000000003", active: true },
  ]);
  assert.deepEqual(await recorder.identify("9000000003"), { matched: false });
  assert.equal((await getConversation(db, id))!.session.worker, null);
  assert.deepEqual(await recorder.identify("+91 90000 00001"), { matched: true, name: "Asha Mehta" });
  assert.deepEqual(await recorder.identify("9000000002"), { matched: true, name: "Asha Mehta" });
  assert.equal((await getConversation(db, id))!.session.worker?.name, "Asha Mehta");
  assert.ok(!JSON.stringify(await db.collection("arture_conversations").findOne({ conversationId: id })).includes("90000"));
  recorder.finish("disconnected", "app_disconnected"); await recorder.flush();
});

test("session and event pagination do not lose tied timestamps; orphaned sessions are shown disconnected", async () => {
  const { db, id, machine, recorder } = await setup();
  recorder.finish("completed", "app_completed"); await recorder.flush();
  const now = new Date();
  await db.collection("arture_conversations").insertMany(Array.from({ length: 51 }, () => ({ conversationId: randomUUID(), machineId: machine._id, machineName: machine.name, assetCode: machine.assetCode, model: "test", startedAt: now, lastSeenAt: new Date(now.getTime() - 60000), endedAt: null, status: "active", worker: null })));
  const first = await listConversations(db, machine._id.toHexString());
  assert.equal(first.sessions.length, 50);
  const cursor = JSON.parse(Buffer.from(first.nextCursor!, "base64url").toString());
  const rest = await listConversations(db, machine._id.toHexString(), { startedAt: new Date(cursor.startedAt), id: cursor.id });
  assert.equal(new Set([...first.sessions, ...rest.sessions].map(session => session.id)).size, 52);
  assert.equal(first.sessions[0].status, "disconnected");
  assert.equal(first.sessions[0].endReason, "heartbeat_lost");
  await db.collection("arture_conversation_events").insertMany(Array.from({ length: 201 }, (_, index) => ({ conversationId: id, eventKey: `message-${index}`, sequence: index + 1, kind: "transcript", role: "user", text: `Entry ${index}`, status: "completed", occurredAt: now, updatedAt: now })));
  const events = (await getConversation(db, id))!;
  assert.equal(events.events.length, 200);
  assert.equal(events.nextAfter, 200);
  assert.equal((await getConversation(db, id, events.nextAfter!))!.events.length, 1);
});
