"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { KnowledgeState, KnowledgeHit } from "@/lib/knowledge";

type DocumentRecord = { id: string; originalName: string; mimeType: string; size: number; knowledge?: KnowledgeState };
type Search = { mode: string; backend: string; results: KnowledgeHit[] };
const fieldStyle = { padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, width: "100%", background: "white" };

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}
export default function DocumentKnowledge({ machineId }: { machineId: string }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search | null>(null);
  const fingerprint = useRef("");
  const searchRequest = useRef(0);
  const clearSearch = useCallback(() => { searchRequest.current++; setSearch(null); setSearching(false); }, []);
  const load = useCallback(async () => {
    const body = await readResponse(await fetch(`/api/documents?machineId=${machineId}`, { cache: "no-store" }));
    const next = body.documents as DocumentRecord[];
    const signature = JSON.stringify(next.map(doc => [doc.id, doc.knowledge?.generation, doc.knowledge?.revision, doc.knowledge?.status]));
    if (fingerprint.current !== signature) { clearSearch(); fingerprint.current = signature; }
    setDocuments(next);
  }, [machineId, clearSearch]);
  useEffect(() => {
    const refresh = () => void load().then(() => setLoadError("")).catch(cause => setLoadError(cause.message));
    refresh();
    void fetch("/api/auth/session").then(readResponse).then(({ user }) => setAdmin(user?.role === "admin")).catch(() => setAdmin(false));
    const timer = window.setInterval(refresh, 3000);
    return () => { window.clearInterval(timer); clearSearch(); };
  }, [load, clearSearch]);

  const mutate = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage(""); clearSearch();
    try { await operation(); await load(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Document update failed."); }
    finally { setBusy(false); }
  };
  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); data.set("machineId", machineId);
    void mutate(async () => { await readResponse(await fetch("/api/documents", { method: "POST", body: data })); form.reset(); });
  };
  const replace = (id: string, file: File) => {
    const data = new FormData(); data.set("file", file);
    void mutate(async () => { await readResponse(await fetch(`/api/documents/${id}`, { method: "PUT", body: data })); });
  };
  const remove = (id: string) => {
    if (!confirm("Delete this document and remove it from search?")) return;
    void mutate(async () => { const response = await fetch(`/api/documents/${id}`, { method: "DELETE" }); if (!response.ok) await readResponse(response); });
  };
  const runSearch = async (event: FormEvent) => {
    event.preventDefault(); setSearching(true); setMessage(""); setSearch(null);
    const request = ++searchRequest.current;
    try {
      const result = await readResponse(await fetch("/api/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ machineId, query }) }));
      if (request === searchRequest.current) setSearch(result);
    } catch (cause) { if (request === searchRequest.current) setMessage(cause instanceof Error ? cause.message : "Search failed."); }
    finally { if (request === searchRequest.current) setSearching(false); }
  };
  return <section className="detail-panel" style={{ minWidth: 0 }}>
    <p className="eyebrow">MACHINE KNOWLEDGE</p>
    <h3 style={{ margin: "6px 0 12px", fontSize: 20, fontWeight: 800 }}>Manuals, SOPs &amp; Diagrams</h3>
    <p style={{ color: "#64748b", fontSize: 13 }}>Upload a PDF with selectable text to search this machine’s manuals with page references. Images stay available for download. Voice answers now consult these manuals and cite their sources.</p>
    {admin && <form onSubmit={upload} style={{ display: "grid", gap: 10, margin: "16px 0" }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Upload a manual or diagram (up to 2 MB)
        <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required style={{ ...fieldStyle, marginTop: 6 }} />
      </label>
      <button className="btn-secondary" disabled={busy} style={{ justifySelf: "start" }}>{busy ? "Saving…" : "+ Upload Document"}</button>
    </form>}
    {(loadError || message) && <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{loadError || message}</p>}
    <div style={{ display: "grid", gap: 12 }}>
      {documents.map(doc => {
        const state = doc.knowledge;
        const ready = state?.status === "ready";
        return <article key={doc.id} style={{ border: "1px solid #e2e8f0", padding: 14, borderRadius: 10, overflowWrap: "anywhere" }}>
          <a className="doc-link" href={`/api/documents/${doc.id}/download`}>{doc.originalName}</a>
          <p style={{ fontSize: 12, margin: "6px 0", color: ready ? "#15803d" : state?.status === "failed" ? "#b91c1c" : "#64748b" }}>
            {Math.ceil(doc.size / 1024)} KB · {ready ? `Ready · ${state.pages} pages · ${state.chunks} passages · ${state.mode === "vector" ? "Semantic search" : "Keyword search"}` : state?.status === "processing" ? "Processing document…" : state?.status === "failed" ? "Search unavailable for this file" : "Queued for processing"}
          </p>
          {state?.error && <p style={{ fontSize: 12, color: "#b91c1c", margin: "6px 0" }}>{state.error}</p>}
          {state && ["queued", "processing"].includes(state.status) && Date.now() - new Date(state.updatedAt).getTime() > 120000 && <p style={{ fontSize: 12 }}>This is taking longer than expected. Check that the document worker is running.</p>}
          {admin && <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            {state?.status === "failed" && <button className="btn-secondary" disabled={busy} onClick={() => void mutate(async () => { await readResponse(await fetch(`/api/documents/${doc.id}/retry`, { method: "POST" })); })}>Retry processing</button>}
            <label style={{ fontSize: 12, color: "#475569", display: "grid", gap: 4 }}>Replace {doc.originalName}
              <input type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} style={{ fontSize: 11, maxWidth: "100%" }} onChange={event => { const file = event.currentTarget.files?.[0]; if (file) replace(doc.id, file); event.currentTarget.value = ""; }} />
            </label>
            <button disabled={busy} onClick={() => remove(doc.id)} style={{ color: "#b91c1c", fontSize: 12 }} aria-label={`Delete ${doc.originalName}`}>Delete</button>
          </div>}
        </article>;
      })}
      {!documents.length && <p style={{ color: "#64748b", fontSize: 13 }}>No documents uploaded yet. Add the water pump manual to get started.</p>}
    </div>
    <form onSubmit={event => void runSearch(event)} style={{ display: "grid", gap: 10, marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
      <label htmlFor={`knowledge-query-${machineId}`} style={{ fontWeight: 700 }}>Search this machine’s manuals</label>
      <input id={`knowledge-query-${machineId}`} value={query} onChange={event => { setQuery(event.target.value); clearSearch(); }} maxLength={500} required placeholder="e.g. impeller, priming, seal maintenance" style={fieldStyle} />
      <button className="btn-primary" disabled={searching || busy || !documents.some(doc => doc.knowledge?.status === "ready")} style={{ justifySelf: "start" }}>{searching ? "Searching…" : "Search manuals"}</button>
    </form>
    {search && <div aria-live="polite" style={{ marginTop: 16 }}>
      <p style={{ color: "#64748b", fontSize: 12 }}>{search.mode === "vector" ? "Semantic search" : "Keyword search"} · {search.backend === "atlas" ? "MongoDB Atlas" : "Local MongoDB"} · {search.results.length} matching passages</p>
      {!search.results.length && <p style={{ fontSize: 13 }}>No matching passages. Try a term used in the manual. Newly processed Atlas documents can take a moment to appear.</p>}
      {search.results.map((hit, index) => <article key={`${hit.documentId}-${hit.page}-${index}`} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
        <a className="doc-link" href={hit.downloadUrl}>{hit.originalName} · Page {hit.page}</a>
        <p style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.7 }}>{hit.text}</p>
      </article>)}
    </div>}
  </section>;
}
