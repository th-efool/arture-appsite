"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationEvent, ConversationSummary } from "@/lib/conversation-types";

type SessionPage = { sessions: ConversationSummary[]; nextCursor: string | null };
type SessionDetail = { session: ConversationSummary; events: ConversationEvent[]; nextAfter: number | null };
const statusLabels: Record<string, string> = { connecting: "Connecting", active: "In progress", completed: "Completed", disconnected: "Disconnected", failed: "Failed", interrupted: "Interrupted", streaming: "In progress", pending: "Pending", succeeded: "Succeeded", partial: "Partly succeeded", returned: "Result returned", searching: "Searching manuals", retrieved: "Sources returned", no_sources: "No supporting passages", unavailable: "Search unavailable", cancelled: "Cancelled" };
function duration(seconds: number) { return `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
async function read<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Could not load conversation history.");
  return response.json();
}
function Badge({ status }: { status: string }) {
  const color = status === "failed" ? "#b91c1c" : ["completed", "succeeded"].includes(status) ? "#047857" : ["active", "connecting", "streaming"].includes(status) ? "#0369a1" : "#64748b";
  return <span style={{ fontSize: 12, fontWeight: 700, color }}>{statusLabels[status] ?? status}</span>;
}

export default function ConversationSessions({ machineId }: { machineId: string }) {
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<string>();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState("");
  const [detailMessage, setDetailMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const paged = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const page = await read<SessionPage>(`/api/conversations?machineId=${machineId}`, controller.signal);
        if (controller.signal.aborted) return;
        setSessions(previous => [...new Map([...previous, ...page.sessions].map(session => [session.id, session])).values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id)));
        if (!paged.current) setCursor(page.nextCursor);
        setListMessage("");
      } catch { if (!controller.signal.aborted) setListMessage("Could not refresh sessions. Previously loaded records may be out of date."); }
      finally { fetching = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [machineId]);
  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    setDetailMessage("");
    const controller = new AbortController();
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await read<SessionDetail>(`/api/conversations/${selected}`, controller.signal);
        if (controller.signal.aborted) return;
        setDetail(previous => {
          const events = [...new Map([...(previous?.events ?? []), ...result.events].map(event => [event.id, event])).values()].sort((a, b) => a.sequence - b.sequence);
          return { ...result, events, nextAfter: result.session.eventCount > events.length ? events.at(-1)?.sequence ?? result.nextAfter : null };
        });
        setDetailMessage("");
      } catch { if (!controller.signal.aborted) setDetailMessage("Could not refresh this session."); }
      finally { fetching = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [selected]);
  const loadOlder = async () => {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const page = await read<SessionPage>(`/api/conversations?machineId=${machineId}&cursor=${encodeURIComponent(cursor)}`);
      paged.current = true;
      setSessions(previous => [...new Map([...previous, ...page.sessions].map(session => [session.id, session])).values()]);
      setCursor(page.nextCursor);
    } catch { setListMessage("Could not load older sessions."); }
    finally { setBusy(false); }
  };
  const loadEvents = async () => {
    if (!detail?.nextAfter || !selected || busy) return;
    const id = selected;
    setBusy(true);
    try {
      const page = await read<SessionDetail>(`/api/conversations/${id}?after=${detail.nextAfter}`);
      setDetail(previous => previous?.session.id === id ? { ...page, events: [...new Map([...previous.events, ...page.events].map(event => [event.id, event])).values()].sort((a, b) => a.sequence - b.sequence) } : previous);
    } catch { setDetailMessage("Could not load more session events."); }
    finally { setBusy(false); }
  };
  return <section className="detail-panel" aria-label="Conversation sessions">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
      <div><p className="eyebrow">APP CONVERSATIONS</p><h3 style={{ margin: "6px 0" }}>Voice Sessions</h3></div>
      <span style={{ fontSize: 12, color: "#64748b" }}>Saved history · refreshes every 5s</span>
    </div>
    <p style={{ color: "#64748b", fontSize: 13 }}>Review transcripts and AR tool results. Worker names appear only after a directory match; unmatched sessions stay unassigned. Audio recordings are not stored.</p>
    {listMessage && <p role="alert" style={{ color: "#b91c1c" }}>{listMessage}</p>}
    {loading && <p>Loading sessions…</p>}
    {!loading && !sessions.length && !listMessage && <p>No app sessions recorded yet. Start a conversation in Unity to create one.</p>}
    <div style={{ display: "grid", gap: 10 }}>
      {sessions.map(session => <button key={session.id} onClick={() => setSelected(session.id)} aria-pressed={selected === session.id} style={{ textAlign: "left", padding: 14, borderRadius: 10, border: `1px solid ${selected === session.id ? "#f97316" : "#e2e8f0"}`, background: selected === session.id ? "#fff7ed" : "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><b>{session.worker?.name ?? "Unassigned"}</b><Badge status={session.status} /></div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{new Date(session.startedAt).toLocaleString()} · {duration(session.durationSeconds)}</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>{session.transcriptCount} transcript entries · {session.toolCount} tool calls</div>
      </button>)}
    </div>
    {cursor && <button className="btn-secondary" disabled={busy} onClick={() => void loadOlder()} style={{ marginTop: 12 }}>Load older sessions</button>}
    {selected && <div style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 18 }} aria-label="Session detail">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><h4 style={{ margin: 0 }}>Session Transcript &amp; AR Actions</h4><button onClick={() => setSelected(undefined)} aria-label="Close session detail">×</button></div>
      {detailMessage && <p role="alert" style={{ color: "#b91c1c" }}>{detailMessage}</p>}
      {!detail && !detailMessage && <p>Loading session…</p>}
      {detail && <>
        <p style={{ color: "#64748b", fontSize: 13 }}>{detail.session.worker?.name ?? "Unassigned worker"} · {duration(detail.session.durationSeconds)} · <Badge status={detail.session.status} /></p>
        <p style={{ color: "#64748b", fontSize: 12 }}>Started {new Date(detail.session.startedAt).toLocaleString()}{detail.session.endedAt ? ` · Ended ${new Date(detail.session.endedAt).toLocaleString()}` : " · Session open"}</p>
        {detail.session.endReason && <p style={{ fontSize: 12 }}>End reason: {detail.session.endReason.replaceAll("_", " ")}</p>}
        {!detail.events.length && <p>No transcripts or tool results were received for this session.</p>}
        <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
          {detail.events.map(event => <li key={event.id} style={{ padding: 14, borderRadius: 10, background: event.kind === "tool" ? "#fff7ed" : "#f8fafc", border: "1px solid #e2e8f0", overflowWrap: "anywhere" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><b style={{ fontSize: 13 }}>{event.kind === "transcript" ? event.role === "user" ? "User" : "Assistant" : event.kind === "tool" ? event.name || "AR tool" : event.kind === "knowledge" ? "Manual search" : "Session notice"}</b><Badge status={event.status} /></div>
            <small style={{ color: "#64748b" }}>{new Date(event.occurredAt).toLocaleTimeString()}</small>
            {event.kind === "transcript" && <p style={{ whiteSpace: "pre-wrap", fontSize: 14, marginBottom: 0 }}>{event.text || (event.status === "failed" ? "Transcription failed." : event.status === "interrupted" ? "No final transcript received." : "Waiting for transcript…")}</p>}
            {event.kind === "notice" && <p style={{ fontSize: 13 }}>{event.text}{event.code ? ` (${event.code})` : ""}</p>}
            {event.kind === "knowledge" && <>
              <p style={{ fontSize: 13 }}>Search: {event.query || "No valid query received"}</p>
              <p style={{ color: "#64748b", fontSize: 12 }}>{event.backend === "atlas" ? "MongoDB Atlas" : event.backend === "local" ? "Local MongoDB" : "Document retrieval"}{event.durationMs !== undefined ? ` · ${(event.durationMs / 1000).toFixed(1)}s` : ""}{event.status === "retrieved" ? " · Sources returned to the voice model" : ""}</p>
              {event.sources?.map(source => <div key={`${source.citation}-${source.documentId}-${source.page}`} style={{ marginTop: 12 }}>
                <a className="doc-link" href={source.downloadUrl}>[{source.citation}] {source.originalName} · Page {source.page}</a>
                <p style={{ fontSize: 12, color: "#64748b" }}>Version {source.revision} · Recorded excerpt; the current document may have changed or been removed.</p>
                <p style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{source.excerpt}</p>
              </div>)}
              {event.status === "no_sources" && <p style={{ fontSize: 13 }}>No sufficiently relevant passages were found. The assistant was instructed to say when the manual does not support an answer.</p>}
              {event.status === "unavailable" && <p style={{ fontSize: 13 }}>Search failed or timed out. The assistant was instructed to report this instead of guessing.</p>}
            </>}
            {event.kind === "tool" && <>{event.component && <p style={{ fontSize: 13 }}>Component: <b>{event.component}</b></p>}<details style={{ marginTop: 8 }}><summary style={{ cursor: "pointer", fontSize: 13 }}>Arguments and result</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify({ arguments: event.arguments, result: event.result }, null, 2)}</pre></details></>}
          </li>)}
        </ol>
        {detail.nextAfter && <button className="btn-secondary" disabled={busy} onClick={() => void loadEvents()}>Load more events</button>}
      </>}
    </div>}
  </section>;
}
