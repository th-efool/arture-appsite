import { type Db, type Document, ObjectId } from "mongodb";
import type { ConversationSummary, ConversationEvent, ConversationStatus } from "./conversation-types";

export const conversationIdPattern = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export function conversationSummary(record: Document, now = new Date()): ConversationSummary {
  const stale = ["connecting", "active"].includes(record.status) && now.getTime() - new Date(record.lastSeenAt).getTime() >= 30000;
  const endedAt = record.endedAt ?? (stale ? record.lastSeenAt : null);
  return {
    id: record.conversationId, machineId: record.machineId.toHexString(), machineName: record.machineName, assetCode: record.assetCode, model: record.model,
    status: stale ? "disconnected" : record.status as ConversationStatus,
    startedAt: record.startedAt.toISOString(), lastSeenAt: record.lastSeenAt.toISOString(), endedAt: endedAt?.toISOString() ?? null,
    worker: record.worker ?? null, endReason: stale ? "heartbeat_lost" : record.endReason ?? null,
    durationSeconds: Math.max(0, Math.floor((new Date(endedAt ?? now).getTime() - record.startedAt.getTime()) / 1000)),
    transcriptCount: record.transcriptCount ?? 0, toolCount: record.toolCount ?? 0, eventCount: record.eventCount ?? 0,
  };
}

const counts = [
  { $lookup: { from: "arture_conversation_events", let: { conversation: "$conversationId" }, pipeline: [
    { $match: { $expr: { $eq: ["$conversationId", "$$conversation"] } } },
    { $group: { _id: null, total: { $sum: 1 }, transcripts: { $sum: { $cond: [{ $and: [{ $eq: ["$kind", "transcript"] }, { $ne: ["$text", ""] }] }, 1, 0] } }, tools: { $sum: { $cond: [{ $eq: ["$kind", "tool"] }, 1, 0] } } } },
  ], as: "eventCounts" } },
  { $set: { eventCount: { $ifNull: [{ $first: "$eventCounts.total" }, 0] }, transcriptCount: { $ifNull: [{ $first: "$eventCounts.transcripts" }, 0] }, toolCount: { $ifNull: [{ $first: "$eventCounts.tools" }, 0] } } },
];

export async function listConversations(db: Db, machineId: string, cursor?: { startedAt: Date; id: string }) {
  const filter = { machineId: new ObjectId(machineId), ...(cursor ? { $or: [{ startedAt: { $lt: cursor.startedAt } }, { startedAt: cursor.startedAt, conversationId: { $lt: cursor.id } }] } : {}) };
  const records = await db.collection("arture_conversations").aggregate([
    { $match: filter }, { $sort: { startedAt: -1, conversationId: -1 } }, { $limit: 51 }, ...counts,
  ]).toArray();
  const page = records.slice(0, 50);
  const last = page.at(-1);
  return { sessions: page.map(record => conversationSummary(record)), nextCursor: records.length > 50 && last ? Buffer.from(JSON.stringify({ startedAt: last.startedAt.toISOString(), id: last.conversationId })).toString("base64url") : null };
}

export async function getConversation(db: Db, id: string, after = 0) {
  const record = (await db.collection("arture_conversations").aggregate([{ $match: { conversationId: id } }, ...counts]).toArray())[0];
  if (!record) return null;
  const summary = conversationSummary(record);
  const entries = await db.collection("arture_conversation_events").find({ conversationId: id, sequence: { $gt: after } }).sort({ sequence: 1 }).limit(201).toArray();
  const page = entries.slice(0, 200);
  const stopped = !["connecting", "active"].includes(summary.status);
  const events: ConversationEvent[] = page.map(entry => ({
    id: entry.eventKey, sequence: entry.sequence, kind: entry.kind, occurredAt: entry.occurredAt.toISOString(), updatedAt: entry.updatedAt.toISOString(),
    status: stopped && ["pending", "streaming", "searching"].includes(entry.status) ? "interrupted" : entry.status,
    ...(entry.kind === "transcript" ? { role: entry.role, text: entry.text, responseId: entry.responseId } : {}),
    ...(entry.kind === "tool" ? { name: entry.name, callId: entry.callId, arguments: entry.arguments, result: entry.result, responseId: entry.responseId, component: entry.component } : {}),
    ...(entry.kind === "notice" ? { text: entry.text, code: entry.code } : {}),
    ...(entry.kind === "knowledge" ? { query: entry.query, sources: entry.sources, responseId: entry.responseId, mode: entry.mode, backend: entry.backend, durationMs: entry.durationMs } : {}),
  }));
  return { session: summary, events, nextAfter: entries.length > 200 ? page.at(-1)!.sequence : null };
}
