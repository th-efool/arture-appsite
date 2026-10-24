import { createServer } from "node:http";
import { randomUUID, timingSafeEqual, createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ObjectId, type Db } from "mongodb";
import WebSocket, { WebSocketServer } from "ws";
import { waterPump } from "./demo-machine";
import { ConversationRecorder, ensureConversationIndexes } from "./conversation-recorder";
import { RealtimeKnowledge, relayKnowledgeOptions } from "./realtime-knowledge";
import type { KnowledgeOptions } from "./knowledge";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";
export type RelayOptions = {
  db: Db;
  apiKey: string;
  accessKey: string;
  model?: string;
  host?: string;
  port?: number;
  heartbeatMs?: number;
  timeoutMs?: number;
  maxConnections?: number;
  /** Injection point for tests; the public client cannot choose an upstream URL. */
  upstreamUrl?: string;
  knowledge?: KnowledgeOptions | false;
};

const allowedEvents = new Set([
  "session.update", "input_audio_buffer.append", "input_audio_buffer.commit", "input_audio_buffer.clear",
  "conversation.item.create", "conversation.item.truncate", "conversation.item.delete", "conversation.item.retrieve",
  "response.create", "response.cancel",
]);
const maxBufferedBytes = 4 * 1024 * 1024;
function matchesKey(actual: string, expected: string) {
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startRealtimeRelay(options: RelayOptions) {
  if (!options.accessKey || options.accessKey.length < 24) throw new Error("ARTURE_RELAY_ACCESS_KEY must contain at least 24 characters.");
  const knowledgeConfig = options.knowledge === false ? false : relayKnowledgeOptions(options.apiKey, options.knowledge);
  const connections = options.db.collection("arture_app_connections");
  await connections.createIndex({ connectionId: 1 }, { unique: true, sparse: true });
  await connections.createIndex({ assetCode: 1, lastSeenAt: -1 });
  await ensureConversationIndexes(options.db);
  const model = options.model ?? "gpt-realtime-2.1-mini";
  const heartbeatMs = options.heartbeatMs ?? 5000;
  const timeoutMs = options.timeoutMs ?? 30000;
  const server = createServer((request, response) => {
    if (request.url !== "/health") { response.writeHead(404).end(); return; }
    response.writeHead(options.apiKey ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ service: "arture-realtime-relay", configured: !!options.apiKey }));
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024, perMessageDeflate: false });
  const sessions = new Set<{ close: () => void; done: () => Promise<void> }>();
  let stopping = false;
  let upgrades = 0;
  server.on("upgrade", (request, socket, head) => {
    socket.on("error", () => {});
    const reject = (code: number, message: string) => { socket.end(`HTTP/1.1 ${code} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); };
    const url = new URL(request.url ?? "/", "http://relay.local");
    if (url.pathname !== "/realtime") { reject(404, "Not Found"); return; }
    const token = request.headers.authorization?.replace(/^Bearer /i, "") ?? "";
    if (!matchesKey(token, options.accessKey)) { reject(401, "Unauthorized"); return; }
    if (url.searchParams.get("assetCode") !== waterPump.assetCode) { reject(403, "Forbidden"); return; }
    if (!options.apiKey) { reject(503, "Voice Not Configured"); return; }
    if (stopping || sessions.size + upgrades >= (options.maxConnections ?? 8)) { reject(503, "Relay Busy"); return; }
    upgrades++;
    const deadline = setTimeout(() => socket.destroy(), 10000);
    const resolveTargetMachine = async () => {
      try {
        let machine = await options.db.collection("arture_machines").findOne({ assetCode: waterPump.assetCode, archivedAt: null });
        if (!machine) {
          const now = new Date();
          await options.db.collection("arture_machines").updateOne(
            { assetCode: waterPump.assetCode },
            { $setOnInsert: { ...waterPump, seedKey: "arture-demo-water-pump-v1", archivedAt: null, createdAt: now, updatedAt: now } },
            { upsert: true }
          );
          machine = await options.db.collection("arture_machines").findOne({ assetCode: waterPump.assetCode, archivedAt: null });
        }
        return machine;
      } catch (err: unknown) {
        console.warn("MongoDB machine lookup failed, falling back to demo pump twin:", (err as Error)?.message ?? err);
        return { _id: new ObjectId(), ...waterPump };
      }
    };

    void resolveTargetMachine().then(machine => {
      clearTimeout(deadline);
      if (socket.destroyed || stopping) return;
      const targetMachine = machine || { _id: new ObjectId(), ...waterPump };
      wss.handleUpgrade(request, socket, head, client => {
        const id = randomUUID();
        let state: ConnectionState = "connecting";
        let ended = false;
        let errorCode: string | null = null;
        let clientPong = Date.now(), upstreamPong = Date.now();
        let writes: Promise<unknown> = Promise.resolve();
        let queuedBytes = 0;
        const queued: string[] = [];
        let upstream: WebSocket;
        let heartbeat: ReturnType<typeof setInterval>;
        let lastIdentityAttempt = 0;
        let knowledge: RealtimeKnowledge | undefined;
        const persist = () => {
          const now = new Date();
          const snapshot = { connectionId: id, assetCode: waterPump.assetCode, machineId: targetMachine._id, model, state, errorCode, lastSeenAt: now, endedAt: ended ? now : null };
          writes = writes.then(() => connections.updateOne({ connectionId: id }, { $set: snapshot, $setOnInsert: { startedAt: now } }, { upsert: true })).catch(() => {
            if (!ended) finish("error", "status_storage_failed");
          });
        };
        const send = (destination: WebSocket, payload: string) => {
          if (destination.readyState !== WebSocket.OPEN) return;
          if (destination.bufferedAmount > maxBufferedBytes) { finish("error", "audio_backpressure"); return; }
          destination.send(payload, error => { if (error) finish("error", "transport_failed"); });
        };
        const finish = (finalState: "disconnected" | "error", reason: string | null = null) => {
          if (ended) return;
          ended = true;
          knowledge?.close();
          state = finalState;
          errorCode = reason;
          clearInterval(heartbeat);
          queued.length = 0;
          recorder.finish(finalState === "error" ? "failed" : reason === "app_completed" ? "completed" : "disconnected", reason);
          persist();
          if (finalState === "error" && client.readyState === WebSocket.OPEN && client.bufferedAmount < maxBufferedBytes) {
            client.send(JSON.stringify({ type: "error", error: { type: "server_error", code: reason, message: "Arture voice relay could not continue. Check the backend connection status." } }));
          }
          for (const ws of [client, upstream]) {
            if (!ws) continue;
            if (ws.readyState === WebSocket.OPEN) ws.close(finalState === "error" ? 1011 : 1000, reason ?? "Session ended");
            else if (ws.readyState === WebSocket.CONNECTING) ws.terminate();
          }
          // A peer that has vanished must not keep a session or server shutdown alive.
          const reap = setTimeout(() => { client.terminate(); upstream?.terminate(); }, 1000);
          reap.unref();
          void Promise.all([writes, recorder.flush()]).then(() => sessions.delete(session));
        };
        const session = { close: () => finish("disconnected", "relay_shutdown"), done: async () => { await writes; await recorder.flush(); } };
        const recorder = new ConversationRecorder(options.db, id, { _id: targetMachine._id, name: String(targetMachine.name), assetCode: waterPump.assetCode }, model, () => finish("error", "conversation_storage_failed"));
        sessions.add(session);
        persist();
        const upstreamUrl = new URL(options.upstreamUrl ?? "wss://api.openai.com/v1/realtime");
        upstreamUrl.searchParams.set("model", model);
        upstream = new WebSocket(upstreamUrl, { headers: { Authorization: `Bearer ${options.apiKey}` }, handshakeTimeout: 15000, maxPayload: 8 * 1024 * 1024, perMessageDeflate: false });
        if (knowledgeConfig) knowledge = new RealtimeKnowledge(options.db, targetMachine._id, knowledgeConfig,
          event => { if (!ended) send(upstream, JSON.stringify(event)); },
          event => { if (!ended) send(client, JSON.stringify(event)); }, entry => recorder.retrieval(entry));
        upstream.on("open", () => {
          if (ended) { upstream.close(); return; }
          upstreamPong = Date.now();
          for (const payload of queued) send(upstream, payload);
          queued.length = 0;
          queuedBytes = 0;
        });
        upstream.on("pong", () => { upstreamPong = Date.now(); });
        client.on("pong", () => { clientPong = Date.now(); });
        upstream.on("message", (raw, binary) => {
          if (ended) return;
          if (binary) { finish("error", "invalid_upstream_event"); return; }
          const payload = raw.toString();
          let fatalCode: string | null = null;
          try {
            const event = knowledge ? knowledge.provider(JSON.parse(payload)) : JSON.parse(payload);
            if (!event) return;
            recorder.provider(event);
            if (event.type === "session.updated") { state = "connected"; errorCode = null; persist(); }
            const code = event.type === "error" ? event.error?.code : event.type === "response.done" && event.response?.status === "failed" ? event.response?.status_details?.error?.code : null;
            if (["invalid_api_key", "insufficient_quota", "model_not_found", "permission_denied", "rate_limit_exceeded"].includes(code)) fatalCode = `openai_${code}`;
          } catch { finish("error", "invalid_upstream_event"); return; }
          send(client, payload);
          if (fatalCode) finish("error", fatalCode);
        });
        client.on("message", (raw, binary) => {
          if (ended) return;
          let event;
          try { if (binary) throw new Error(); event = JSON.parse(raw.toString()); } catch { finish("error", "invalid_client_event"); return; }
          if (!event || typeof event !== "object" || Array.isArray(event)) { finish("error", "invalid_client_event"); return; }
          if (event.type === "arture.session.end") { finish("disconnected", "app_completed"); return; }
          if (event.type === "arture.identify") {
            if (Date.now() - lastIdentityAttempt < 1000) return;
            lastIdentityAttempt = Date.now();
            if (typeof event.phone !== "string" || event.phone.length > 40) { send(client, JSON.stringify({ type: "arture.worker", matched: false })); return; }
            void recorder.identify(event.phone).then(result => { if (!ended) send(client, JSON.stringify({ type: "arture.worker", ...result })); });
            return;
          }
          if (!allowedEvents.has(event.type)) { finish("error", "unsupported_client_event"); return; }
          if (knowledge && !knowledge.client(event)) return;
          // Stable item IDs make client text and the provider echo the same history entry.
          if (event.type === "conversation.item.create" && event.item?.type === "message" && !event.item.id) event.item.id = `arture_${(typeof event.event_id === "string" ? createHash("sha256").update(event.event_id).digest("hex") : randomUUID().replaceAll("-", "")).slice(0, 24)}`;
          try { recorder.client(event); } catch { finish("error", "invalid_client_event"); return; }
          if (event.type === "session.update") {
            if (!event.session || typeof event.session !== "object" || Array.isArray(event.session)) { finish("error", "invalid_session_update"); return; }
            // The server owns model/routing; retain Unity's tools and microphone settings.
            delete event.session.model;
            event.session.type = "realtime";
            if (typeof event.session.instructions === "string") event.session.instructions += `\nMachine identity: ${waterPump.name}; asset code ${waterPump.assetCode}.`;
          }
          const payload = JSON.stringify(event);
          if (upstream.readyState === WebSocket.OPEN) send(upstream, payload);
          else if (upstream.readyState === WebSocket.CONNECTING) {
            queuedBytes += Buffer.byteLength(payload);
            if (queuedBytes > 256 * 1024) { finish("error", "startup_buffer_full"); return; }
            queued.push(payload);
          }
        });
        upstream.on("unexpected-response", (_request, response) => { response.resume(); finish("error", `openai_http_${response.statusCode ?? 0}`); });
        upstream.on("error", () => finish("error", "openai_connection_failed"));
        upstream.on("close", () => finish("disconnected", "openai_disconnected"));
        client.on("close", () => finish("disconnected", "app_disconnected"));
        client.on("error", () => finish("error", "app_transport_failed"));
        const startedAt = Date.now();
        heartbeat = setInterval(() => {
          if (ended) return;
          const now = Date.now();
          if (now - clientPong > timeoutMs || now - upstreamPong > timeoutMs) { finish("error", "heartbeat_timeout"); return; }
          if (state === "connecting" && now - startedAt > timeoutMs) { finish("error", "session_setup_timeout"); return; }
          if (now - startedAt > 60 * 60 * 1000) { finish("disconnected", "session_time_limit"); return; }
          if (client.readyState === WebSocket.OPEN) client.ping();
          if (upstream.readyState === WebSocket.OPEN) upstream.ping();
          recorder.heartbeat();
          persist();
        }, heartbeatMs);
      });
    }).catch(() => reject(503, "Storage Unavailable")).finally(() => { upgrades--; clearTimeout(deadline); });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 3101, options.host ?? "0.0.0.0", resolve);
  });
  return {
    port: (server.address() as AddressInfo).port,
    async close() {
      stopping = true;
      const active = [...sessions];
      active.forEach(session => session.close());
      await Promise.all(active.map(session => session.done()));
      await new Promise<void>(resolve => wss.close(() => resolve()));
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
