export type ConversationStatus = "connecting" | "active" | "completed" | "disconnected" | "failed";
export type ConversationSummary = {
  id: string; machineId: string; machineName: string; assetCode: string; model: string;
  status: ConversationStatus; startedAt: string; endedAt: string | null; lastSeenAt: string;
  worker: { id: string; name: string; matchedBy: "phone" } | null;
  endReason: string | null; durationSeconds: number;
  transcriptCount: number; toolCount: number; eventCount: number;
};
export type ConversationEvent = {
  id: string; sequence: number; kind: "transcript" | "tool" | "notice" | "knowledge";
  occurredAt: string; updatedAt: string;
  role?: "user" | "assistant"; text?: string; status: string;
  name?: string; callId?: string; arguments?: unknown; result?: unknown;
  responseId?: string; component?: string; code?: string;
  query?: string; sources?: import("./realtime-knowledge").RetrievalSource[]; mode?: string; backend?: string; durationMs?: number;
};
