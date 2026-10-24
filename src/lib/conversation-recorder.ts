import type { Db, ObjectId } from "mongodb";
import { phoneIdentity } from "./phone";
import type { RetrievalRecord } from "./realtime-knowledge";

type EventInput = Record<string, any>; // Realtime wire events are narrowed by type below; raw payloads are never persisted.
type Entry = { eventKey: string; sequence: number; kind: "transcript" | "tool" | "notice" | "knowledge"; occurredAt: Date; updatedAt: Date; status: string; [key: string]: unknown };
const maxText = 24000;
function text(value: unknown) { return typeof value === "string" ? value.slice(0, maxText) : ""; }
function safeJson(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") { try { return safeJson(JSON.parse(value), depth + 1); } catch { return text(value); } }
  if (Array.isArray(value)) return value.slice(0, 100).map(item => safeJson(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 100).filter(([key]) => !/authorization|password|secret|api.?key|access.?token/i.test(key)).map(([key, item]) => [key, typeof item === "string" ? text(item) : item && typeof item === "object" ? safeJson(item, depth + 1) : item]));
  return value ?? null;
}

export async function ensureConversationIndexes(db: Db) {
  await Promise.all([
    db.collection("arture_conversations").createIndex({ conversationId: 1 }, { unique: true }),
    db.collection("arture_conversations").createIndex({ machineId: 1, startedAt: -1, conversationId: -1 }),
    db.collection("arture_conversation_events").createIndex({ conversationId: 1, eventKey: 1 }, { unique: true }),
    db.collection("arture_conversation_events").createIndex({ conversationId: 1, sequence: 1 }, { unique: true }),
  ]);
  await db.collection("arture_conversations").updateMany(
    { status: { $in: ["connecting", "active"] }, lastSeenAt: { $lt: new Date(Date.now() - 30000) } },
    [{ $set: { status: "disconnected", endedAt: "$lastSeenAt", endReason: "heartbeat_lost" } }],
  );
}

export class ConversationRecorder {
  private queue: Promise<void> = Promise.resolve();
  private entries = new Map<string, Entry>();
  private dirty = new Set<string>();
  private sequence = 0;
  private pending = 0;
  private ended = false;
  private failed = false;
  private responseId = "";
  private seen = new Set<string>();
  private matchedWorker: { id: string; name: string; matchedBy: string } | null = null;
  constructor(private db: Db, readonly id: string, machine: { _id: ObjectId; name: string; assetCode: string }, model: string, private onFailure: () => void) {
    const now = new Date();
    this.write(async () => {
      await db.collection("arture_conversations").updateOne({ conversationId: id }, { $setOnInsert: { conversationId: id, connectionId: id, machineId: machine._id, machineName: machine.name, assetCode: machine.assetCode, model, status: "connecting", worker: null, startedAt: now, lastSeenAt: now, endedAt: null, endReason: null } }, { upsert: true });
    });
  }
  private write(operation: () => Promise<void>) {
    if (++this.pending > 512) { this.pending--; this.reportFailure(); return; }
    this.queue = this.queue.then(operation).catch(() => this.reportFailure()).finally(() => { this.pending--; });
  }
  private reportFailure() { if (!this.failed) { this.failed = true; this.onFailure(); } }
  private entry(key: string, kind: Entry["kind"], fields: Record<string, unknown>): Entry | undefined {
    let item = this.entries.get(key);
    if (!item) {
      if (this.entries.size >= 2000) { this.reportFailure(); return; }
      const now = new Date();
      item = { eventKey: key, sequence: ++this.sequence, kind, occurredAt: now, updatedAt: now, status: "pending", ...fields };
      this.entries.set(key, item);
    }
    return item;
  }
  private save(item: Entry) {
    item.updatedAt = new Date();
    this.dirty.delete(item.eventKey);
    const snapshot = { ...item };
    delete snapshot.argumentBuffer;
    if (item.argumentBuffer) snapshot.arguments = safeJson(item.argumentBuffer);
    this.write(async () => { await this.db.collection("arture_conversation_events").updateOne({ conversationId: this.id, eventKey: item.eventKey }, { $set: { ...snapshot, conversationId: this.id } }, { upsert: true }); });
  }
  private transcript(itemId: unknown, index: unknown, role: "user" | "assistant", responseId?: string) {
    if (typeof itemId !== "string" || !itemId) return;
    const entry = this.entry(`transcript:${itemId}:${Number.isInteger(index) ? index : 0}`, "transcript", { itemId, role, responseId: responseId ?? "", text: "" });
    if (entry && responseId) entry.responseId = responseId;
    return entry;
  }
  provider(event: EventInput) {
    if (this.ended) return;
    const type = event.type;
    if (typeof event.event_id === "string" && type !== "response.output_audio.delta" && type !== "response.audio.delta") {
      if (this.seen.has(event.event_id)) return;
      this.seen.add(event.event_id);
      if (this.seen.size > 20000) this.seen.delete(this.seen.values().next().value!);
    }
    if (type === "session.updated") this.write(async () => { await this.db.collection("arture_conversations").updateOne({ conversationId: this.id }, { $set: { status: "active", lastSeenAt: new Date() } }); });
    if (type === "response.created") this.responseId = text(event.response?.id);
    if (["input_audio_buffer.speech_started", "input_audio_buffer.committed"].includes(type)) {
      const entry = this.transcript(event.item_id, 0, "user");
      if (entry) this.save(entry);
    }
    if (["conversation.item.created", "conversation.item.added"].includes(type) && event.item?.type === "message" && event.item.role === "user") {
      for (const [index, part] of (event.item.content ?? []).entries()) if (part.type === "input_text") {
        const entry = this.transcript(event.item.id, index, "user");
        if (entry) { entry.text = text(part.text); entry.status = "completed"; this.save(entry); }
      }
    }
    if (type === "conversation.item.input_audio_transcription.delta") {
      const entry = this.transcript(event.item_id, event.content_index, "user");
      if (entry && entry.status !== "completed") { entry.text = text(String(entry.text) + text(event.delta)); entry.status = "streaming"; this.dirty.add(entry.eventKey); }
    }
    if (type === "conversation.item.input_audio_transcription.completed") {
      const entry = this.transcript(event.item_id, event.content_index, "user");
      if (entry) { entry.text = text(event.transcript ?? event.text); entry.status = "completed"; this.save(entry); }
    }
    if (type === "conversation.item.input_audio_transcription.failed") {
      const entry = this.transcript(event.item_id, event.content_index, "user");
      if (entry) { entry.status = "failed"; entry.code = text(event.error?.code); this.save(entry); }
    }
    if (["response.output_item.added", "response.output_item.done"].includes(type)) {
      const item = event.item;
      if (item?.type === "message" && item.role === "assistant") {
        const entry = this.transcript(item.id, 0, "assistant", event.response_id);
        if (entry && type.endsWith("added")) this.save(entry);
      }
      if (item?.type === "function_call" && item.call_id) {
        const entry = this.entry(`tool:${item.call_id}`, "tool", { callId: text(item.call_id), name: text(item.name), responseId: text(event.response_id), arguments: {}, result: null });
        if (entry) {
          if (item.name) entry.name = text(item.name);
          if (item.arguments !== undefined || (type.endsWith("done") && entry.argumentBuffer)) { entry.arguments = safeJson(text(item.arguments ?? entry.argumentBuffer)); delete entry.argumentBuffer; }
          this.save(entry);
        }
      }
    }
    if (["response.function_call_arguments.delta", "response.function_call_arguments.done"].includes(type) && event.call_id) {
      const entry = this.entry(`tool:${event.call_id}`, "tool", { callId: text(event.call_id), name: text(event.name), responseId: text(event.response_id), arguments: {}, result: null });
      if (entry) {
        if (event.name) entry.name = text(event.name);
        if (type.endsWith("delta")) { entry.argumentBuffer = text(String(entry.argumentBuffer ?? "") + text(event.delta)); this.dirty.add(entry.eventKey); }
        else { entry.arguments = safeJson(text(event.arguments ?? entry.argumentBuffer)); delete entry.argumentBuffer; this.save(entry); }
      }
    }
    const assistantDelta = ["response.audio_transcript.delta", "response.output_audio_transcript.delta", "response.text.delta", "response.output_text.delta"].includes(type);
    const assistantDone = ["response.audio_transcript.done", "response.output_audio_transcript.done", "response.text.done", "response.output_text.done"].includes(type);
    if (assistantDelta || assistantDone) {
      const entry = this.transcript(event.item_id, event.content_index, "assistant", event.response_id);
      if (entry) {
        if (assistantDone) { entry.text = text(event.transcript ?? event.text); if (entry.status !== "interrupted") entry.status = "completed"; this.save(entry); }
        else if (!["completed", "interrupted"].includes(entry.status)) { entry.text = text(String(entry.text) + text(event.delta)); entry.status = "streaming"; this.dirty.add(entry.eventKey); }
      }
    }
    if (type === "response.done") {
      const response = event.response;
      for (const item of response?.output ?? []) {
        if (item.type === "message" && item.role === "assistant") for (const [index, part] of (item.content ?? []).entries()) {
          const content = part.transcript ?? part.text;
          if (typeof content !== "string") continue;
          const entry = this.transcript(item.id, index, "assistant", response.id);
          if (entry) { entry.text = text(content); entry.status = response.status === "completed" && entry.status !== "interrupted" ? "completed" : "interrupted"; this.save(entry); }
        }
      }
      if (response?.status !== "completed") this.interrupt(text(response?.id));
    }
    if (type === "error") {
      const code = text(event.error?.code ?? "provider_error");
      const entry = this.entry(`notice:${event.event_id ?? `${code}:${this.responseId}`}`, "notice", { code, text: "Voice provider reported an error." });
      if (entry) { entry.status = "failed"; this.save(entry); }
    }
  }
  client(event: EventInput) {
    if (this.ended) return;
    if (event.type === "response.cancel") this.interrupt(text(event.response_id) || this.responseId);
    if (event.type !== "conversation.item.create") return;
    const item = event.item;
    if (item?.type === "function_call_output" && typeof item.call_id === "string") {
      const entry = this.entries.get(`tool:${item.call_id}`);
      if (!entry) return; // Do not invent tool calls based on unsolicited client results.
      entry.result = safeJson(text(item.output));
      const result = entry.result as Record<string, unknown> | null;
      entry.status = result && (result.error || result.ok === false || result.success === false) ? "failed"
        : result && (result.highlighted === false || result.uiDisplayed === false) ? "partial"
        : result && (result.ok === true || result.success === true || (result.highlighted === true && result.uiDisplayed === true)) ? "succeeded" : "returned";
      const args = entry.arguments as Record<string, unknown>;
      if (typeof args?.component === "string") entry.component = text(args.component);
      this.save(entry);
    }
    if (item?.type === "message" && item.role === "user" && item.id) for (const [index, part] of (item.content ?? []).entries()) {
      if (part.type !== "input_text") continue;
      const entry = this.transcript(item.id, index, "user");
      if (entry) { entry.text = text(part.text); entry.status = "completed"; this.save(entry); }
    }
  }
  private interrupt(responseId: string) {
    if (!responseId) return;
    for (const entry of this.entries.values()) if (entry.responseId === responseId && (entry.kind === "transcript" || entry.status === "pending")) { entry.status = "interrupted"; this.save(entry); }
  }
  async identify(phone: string): Promise<{ matched: boolean; name?: string }> {
    let identity: string;
    try { identity = phoneIdentity(phone); } catch { return { matched: false }; }
    let outcome: { matched: boolean; name?: string } = { matched: false };
    this.write(async () => {
      if (this.matchedWorker) { outcome = { matched: true, name: this.matchedWorker.name }; return; }
      const workers = await this.db.collection("arture_technicians").find({ active: true }, { projection: { name: 1, phone: 1 } }).limit(500).toArray();
      const matches = workers.filter(worker => { try { return phoneIdentity(worker.phone) === identity; } catch { return false; } });
      const worker = matches.length === 1 ? { id: matches[0]._id.toHexString(), name: matches[0].name, matchedBy: "phone" } : null;
      this.matchedWorker = worker;
      await this.db.collection("arture_conversations").updateOne({ conversationId: this.id }, { $set: { worker } });
      outcome = worker ? { matched: true, name: worker.name } : { matched: false };
    });
    await this.flush();
    return outcome;
  }
  heartbeat() {
    if (this.ended) return;
    for (const key of this.dirty) { const entry = this.entries.get(key); if (entry) this.save(entry); }
    const lastSeenAt = new Date();
    this.write(async () => { await this.db.collection("arture_conversations").updateOne({ conversationId: this.id }, { $set: { lastSeenAt } }); });
  }
  finish(status: "completed" | "disconnected" | "failed", reason: string | null) {
    if (this.ended) return;
    this.ended = true;
    for (const entry of this.entries.values()) if (["pending", "streaming"].includes(entry.status)) { entry.status = "interrupted"; if (entry.argumentBuffer) { entry.arguments = safeJson(entry.argumentBuffer); delete entry.argumentBuffer; } this.save(entry); }
    const now = new Date();
    this.write(async () => { await this.db.collection("arture_conversations").updateOne({ conversationId: this.id }, { $set: { status, endedAt: now, lastSeenAt: now, endReason: reason } }); });
  }
  retrieval(record: RetrievalRecord) {
    if (this.ended) return;
    const item = this.entry(`knowledge:${record.callId}`, "knowledge", {});
    if (item) { Object.assign(item, record); this.save(item); }
  }
  async flush() { await this.queue; }
}
