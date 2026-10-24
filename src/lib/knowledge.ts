import { Db, GridFSBucket, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { inflateSync } from "node:zlib";

export type KnowledgeState = {
  status: "queued" | "processing" | "ready" | "failed";
  revision: number; attempts: number; generation?: string; leaseUntil?: Date;
  mode?: "keyword" | "vector"; pages?: number; chunks?: number; error?: string; updatedAt: Date;
};
type Source = { _id: ObjectId; machineId: ObjectId; gridFsFileId: ObjectId; originalName: string; mimeType: string; knowledge?: KnowledgeState };
export type PageText = { num: number; text: string };
export type KnowledgeOptions = { mode: "keyword" | "vector"; vectorBackend?: "atlas" | "local"; apiKey?: string; signal?: AbortSignal; embed?: (texts: string[]) => Promise<number[][]>; extract?: (data: Buffer) => Promise<PageText[]> };
export const vectorIndexName = "arture_pump_vectors_v1";
export const embeddingModel = "text-embedding-3-small";
export const embeddingDimensions = 1536;

export function knowledgeOptions(): KnowledgeOptions {
  const apiKey = (process.env.ARTURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").replace(/^"|"$/g, "").trim();
  let mode = process.env.ARTURE_KNOWLEDGE_MODE ?? (apiKey ? "vector" : "keyword");
  if (!apiKey && mode === "vector") {
    console.warn("OpenAI API key missing; falling back knowledge mode to 'keyword'");
    mode = "keyword";
  }
  const vectorBackend = process.env.ARTURE_KNOWLEDGE_VECTOR_BACKEND ?? (mode === "vector" ? "atlas" : "local");
  return { mode: mode as "vector" | "keyword", vectorBackend: vectorBackend as "atlas" | "local", apiKey };
}

export function queuedKnowledge(revision = 1): KnowledgeState {
  return { status: "queued", revision, attempts: 0, updatedAt: new Date() };
}

export async function ensureKnowledgeIndexes(db: Db, vector = false) {
  try {
    await db.collection("arture_document_records").createIndex({ "knowledge.status": 1, "knowledge.leaseUntil": 1 });
  } catch {}
  const chunks = db.collection("arture_knowledge_chunks");
  try {
    await chunks.createIndex({ generation: 1, ordinal: 1 }, { unique: true });
    await chunks.createIndex({ documentId: 1 });
    await chunks.createIndex({ workspace: 1, machineId: 1, text: "text" }, { default_language: "english" });
  } catch {}
  if (vector) {
    try {
      const existing = await chunks.listSearchIndexes(vectorIndexName).toArray().catch(() => []);
      if (!existing.length) {
        await chunks.createSearchIndex({
          name: vectorIndexName,
          type: "vectorSearch",
          definition: {
            fields: [
              { type: "vector", path: "embedding", numDimensions: embeddingDimensions, similarity: "cosine" },
              { type: "filter", path: "machineId" },
              { type: "filter", path: "workspace" },
            ],
          },
        }).catch(() => {});
      }
    } catch {
      // Atlas search index creation requires cluster permissions; ignore if not supported
    }
  }
}

// In-process extraction using pdf-parse (fast, reliable in serverless and containers)
async function extractPdfInProcess(data: Buffer): Promise<PageText[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data, isEvalSupported: false });
  try {
    const info = await parser.getInfo();
    if (info.total > 200) throw new Error("Too many pages");
    const result = await parser.getText();
    return result.pages.map(p => ({ num: p.num, text: p.text }));
  } finally {
    await parser.destroy();
  }
}

// Fallback subprocess extraction if required
async function extractPdfSubprocess(data: Buffer): Promise<PageText[]> {
  const script = `import {PDFParse} from 'pdf-parse';
    const parts=[]; for await(const part of process.stdin) parts.push(part);
    const parser=new PDFParse({data:Buffer.concat(parts),isEvalSupported:false});
    try { const info=await parser.getInfo(); if(info.total>200) throw Error('Too many pages');
      const result=await parser.getText();
      process.stdout.write(JSON.stringify(result.pages.map(p=>({num:p.num,text:p.text}))));
    } finally {await parser.destroy();}`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--max-old-space-size=256", "--input-type=module", "-e", script], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let output = ""; let size = 0; let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 35_000);
    child.stdout.on("data", part => { size += part.length; if (size > 3_000_000) child.kill(); else output += part.toString(); });
    child.stderr.resume();
    child.stdin.on("error", () => undefined);
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(timedOut ? "PDF processing timed out. Use a smaller PDF." : "Cannot read this PDF. Use an unlocked, valid text PDF of at most 200 pages."));
      try { resolve(JSON.parse(output)); } catch { reject(new Error("PDF text extraction failed.")); }
    });
    child.stdin.end(data);
  });
}

export function extractPdfStreamText(data: Buffer): PageText[] {
  try {
    const raw = data.toString("latin1");
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    const pageTexts: string[] = [];

    while ((match = streamRegex.exec(raw)) !== null) {
      let content = match[1];
      const streamStart = match.index;
      const dictSearch = raw.slice(Math.max(0, streamStart - 200), streamStart);
      if (/FlateDecode/.test(dictSearch)) {
        try {
          content = inflateSync(Buffer.from(content, "latin1")).toString("latin1");
        } catch {
          // If uncompressing fails, keep raw content
        }
      }

      const textPieces: string[] = [];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tj: RegExpExecArray | null;
      while ((tj = tjRegex.exec(content)) !== null) {
        if (tj[1]) textPieces.push(tj[1].replace(/\\([\\()])/g, "$1"));
      }

      const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
      let atj: RegExpExecArray | null;
      while ((atj = arrayTjRegex.exec(content)) !== null) {
        const innerRegex = /\(([^)]*)\)/g;
        let inner: RegExpExecArray | null;
        while ((inner = innerRegex.exec(atj[1])) !== null) {
          if (inner[1]) textPieces.push(inner[1].replace(/\\([\\()])/g, "$1"));
        }
      }

      if (textPieces.length > 0) {
        pageTexts.push(textPieces.join(" ").trim());
      }
    }

    if (pageTexts.length > 0) {
      return pageTexts.map((text, idx) => ({ num: idx + 1, text }));
    }
  } catch {}
  return [];
}

export async function extractPdf(data: Buffer): Promise<PageText[]> {
  try {
    return await extractPdfInProcess(data);
  } catch {
    try {
      return await extractPdfSubprocess(data);
    } catch {
      const fallback = extractPdfStreamText(data);
      if (fallback.length > 0 && fallback.some(p => p.text.trim().length > 0)) {
        return fallback;
      }
      throw new Error("Cannot read this PDF. Use an unlocked, valid text PDF of at most 200 pages.");
    }
  }
}

export function splitTextIntoPages(text: string, charsPerPage = 2000): PageText[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("No readable text found in document.");
  const formFeedPages = trimmed.split("\x0c");
  if (formFeedPages.length > 1) {
    return formFeedPages.map((pageStr, idx) => ({
      num: idx + 1,
      text: pageStr.trim() || `(Page ${idx + 1})`
    }));
  }

  const paragraphs = trimmed.split(/\n\s*\n/);
  const pages: PageText[] = [];
  let currentText = "";
  let pageNum = 1;

  for (const p of paragraphs) {
    const pTrim = p.trim();
    if (!pTrim) continue;
    if (currentText && (currentText.length + pTrim.length > charsPerPage)) {
      pages.push({ num: pageNum++, text: currentText });
      currentText = pTrim;
    } else {
      currentText = currentText ? `${currentText}\n\n${pTrim}` : pTrim;
    }
    if (pageNum > 200) break;
  }

  if (currentText) {
    pages.push({ num: pageNum, text: currentText });
  }

  return pages.length ? pages : [{ num: 1, text: trimmed }];
}

export function extractPlainText(data: Buffer): PageText[] {
  const text = data.toString("utf-8");
  if (!text.trim()) {
    throw new Error("No readable text found in document.");
  }
  return splitTextIntoPages(text);
}

export async function extractDocx(data: Buffer): Promise<PageText[]> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: data });
    const text = result.value || "";
    if (!text.trim()) {
      throw new Error("No readable text found in Word document.");
    }
    return splitTextIntoPages(text);
  } catch (error) {
    if (error instanceof Error && error.message.includes("No readable text")) throw error;
    throw new Error("Cannot read this Word document. Ensure it is a valid .docx file.");
  }
}

export async function extractDocumentText(data: Buffer, mimeType: string, filename?: string): Promise<PageText[]> {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  if (mimeType === "application/pdf" || ext === "pdf") {
    return extractPdf(data);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return extractDocx(data);
  }
  return extractPlainText(data);
}

export function chunkPages(pages: PageText[]) {
  const result: { page: number; text: string; ordinal: number }[] = [];
  if (pages.length > 200) throw new Error("Document exceeds the 200-page limit.");
  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();
    for (let start = 0; start < text.length;) {
      let end = Math.min(start + 1500, text.length);
      if (end < text.length) { const boundary = text.lastIndexOf(" ", end); if (boundary > start + 900) end = boundary; }
      result.push({ page: page.num, text: text.slice(start, end), ordinal: result.length });
      if (result.length > 1000) throw new Error("Document exceeds the searchable text limit. Split it into smaller manuals.");
      if (end === text.length) break;
      start = end - 180;
    }
  }
  if (!result.some(chunk => /[\p{L}\p{N}]{3}/u.test(chunk.text))) throw new Error("No readable text found. Scanned PDFs and images need OCR; upload a document with selectable text.");
  return result;
}

export async function embedTexts(texts: string[], apiKey?: string, signal?: AbortSignal): Promise<number[][]> {
  if (!apiKey) throw new Error("OpenAI embedding key is missing. Configure ARTURE_OPENAI_API_KEY and retry.");
  setDefaultResultOrder("ipv4first");
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch("https://api.openai.com/v1/embeddings", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: embeddingModel, input: texts, dimensions: embeddingDimensions, encoding_format: "float" }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) });
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) { await response.body?.cancel(); await new Promise(resolve => setTimeout(resolve, 500)); continue; }
      break;
    } catch {
      if (signal?.aborted) throw new Error("Embedding request cancelled.");
      if (attempt === 1) throw new Error("Embedding service is unreachable. Try again when the OpenAI connection is available.");
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  if (!response) throw new Error("Embedding service is unreachable.");
  if (!response.ok) throw new Error(response.status === 401 ? "OpenAI rejected the embedding key. Replace ARTURE_OPENAI_API_KEY and retry." : `Embedding service failed (${response.status}). Retry after checking API access and quota.`);
  const body = await response.json() as { data: { index: number; embedding: number[] }[] };
  const ordered = body.data?.sort((a, b) => a.index - b.index);
  if (ordered?.some((item, index) => item.index !== index)) throw new Error("Embedding service returned invalid indexes.");
  const vectors = ordered?.map(item => item.embedding);
  if (!vectors || vectors.length !== texts.length || vectors.some(v => v.length !== embeddingDimensions || v.some(n => !Number.isFinite(n)))) throw new Error("Embedding service returned invalid vectors.");
  return vectors;
}

// The document itself is the durable job: upload/replace + enqueue are a single Mongo write.
// Every claim gets a generation token. Only the current lease owner can publish searchable chunks.
export async function processKnowledgeJob(db: Db, options: KnowledgeOptions): Promise<boolean> {
  const records = db.collection<Source>("arture_document_records");
  const generation = randomUUID(); const now = new Date();
  const doc = await records.findOneAndUpdate({ $or: [{ "knowledge.status": "queued" }, { "knowledge.status": "processing", "knowledge.leaseUntil": { $lt: now } }] }, { $set: { "knowledge.status": "processing", "knowledge.generation": generation, "knowledge.leaseUntil": new Date(Date.now() + 90_000), "knowledge.updatedAt": now }, $inc: { "knowledge.attempts": 1 }, $unset: { "knowledge.error": "" } }, { returnDocument: "before", sort: { createdAt: 1 } });
  if (!doc) return false;
  const owner = { _id: doc._id, "knowledge.generation": generation, "knowledge.status": "processing" as const };
  let lost = false;
  const heartbeat = setInterval(() => {
    void records.updateOne(owner, { $set: { "knowledge.leaseUntil": new Date(Date.now() + 90_000) } }).then(result => { if (!result.matchedCount) lost = true; }).catch(() => { lost = true; });
  }, 20_000);
  try {
    if (doc.knowledge?.generation) await db.collection("arture_knowledge_chunks").deleteMany({ generation: doc.knowledge.generation });
    if (doc.knowledge!.attempts >= 5) throw new Error("Processing repeatedly stopped. Retry to start a new attempt.");
    if (doc.mimeType?.startsWith("image/")) {
      throw new Error("Image stored for download. Search needs a text document or PDF with selectable text; OCR is not enabled.");
    }
    const storage = new GridFSBucket(db, { bucketName: "arture_documents" });
    const buffers: Buffer[] = []; let size = 0;
    for await (const part of storage.openDownloadStream(doc.gridFsFileId)) {
      size += part.length;
      if (size > 10_000_000) throw new Error("Document is too large to process.");
      buffers.push(part);
    }
    const rawBuffer = Buffer.concat(buffers);
    const pages = await (options.extract ? options.extract(rawBuffer) : extractDocumentText(rawBuffer, doc.mimeType, doc.originalName));
    const chunks = chunkPages(pages);
    const embed = options.embed ?? ((texts: string[]) => embedTexts(texts, options.apiKey));
    const vectors: number[][] = [];
    if (options.mode === "vector") {
      for (let i = 0; i < chunks.length; i += 32) { if (lost) throw new Error("Processing lease expired."); vectors.push(...await embed(chunks.slice(i, i + 32).map(chunk => chunk.text))); }
      if (vectors.length !== chunks.length) throw new Error("Embedding count does not match extracted chunks.");
    }
    if (lost || !await records.findOne(owner)) return true;
    await db.collection("arture_knowledge_chunks").insertMany(chunks.map((chunk, index) => ({ ...chunk, documentId: doc._id, machineId: doc.machineId, workspace: db.databaseName, revision: doc.knowledge!.revision, generation, ...(options.mode === "vector" ? { embedding: vectors[index] } : {}) })));
    const published = await records.updateOne(owner, { $set: { "knowledge.status": "ready", "knowledge.mode": options.mode, "knowledge.pages": pages.length, "knowledge.chunks": chunks.length, "knowledge.updatedAt": new Date() }, $unset: { "knowledge.leaseUntil": "" } });
    if (!published.matchedCount) await db.collection("arture_knowledge_chunks").deleteMany({ generation });
  } catch (error) {
    const message = error instanceof Error && !/mongo|ECONN|fetch failed|ENOENT/i.test(error.message) ? error.message.slice(0, 300) : "Document processing failed. Check the worker and storage connection, then retry.";
    await records.updateOne(owner, { $set: { "knowledge.status": "failed", "knowledge.error": message, "knowledge.updatedAt": new Date() }, $unset: { "knowledge.leaseUntil": "" } });
    await db.collection("arture_knowledge_chunks").deleteMany({ generation });
  } finally { clearInterval(heartbeat); }
  return true;
}

export async function retryKnowledge(db: Db, id: ObjectId) {
  const previous = await db.collection<Source>("arture_document_records").findOneAndUpdate({ _id: id, "knowledge.status": { $nin: ["queued", "processing"] } }, { $set: { knowledge: queuedKnowledge(Date.now()) } });
  if (previous?.knowledge?.generation) await db.collection("arture_knowledge_chunks").deleteMany({ generation: previous.knowledge.generation });
  return !!previous;
}

export async function startKnowledgeWorker(db: Db, options: KnowledgeOptions, onError: () => void = () => console.error("Knowledge worker storage error; retrying.")) {
  try {
    await ensureKnowledgeIndexes(db, options.mode === "vector" && options.vectorBackend !== "local");
    await db.collection("arture_document_records").updateMany({ knowledge: { $exists: false }, gridFsFileId: { $exists: true } }, { $set: { knowledge: queuedKnowledge() } });
    await db.collection("arture_document_records").updateMany({ "knowledge.status": "ready", "knowledge.mode": { $ne: options.mode } }, { $set: { "knowledge.status": "queued", "knowledge.attempts": 0, "knowledge.updatedAt": new Date() }, $inc: { "knowledge.revision": 1 } });
  } catch (err: unknown) {
    console.warn("Knowledge worker index setup warning (will continue worker loop):", (err as Error)?.message ?? err);
  }
  let stopping = false; let wake: (() => void) | undefined;
  const loop = (async () => {
    while (!stopping) {
      try { if (await processKnowledgeJob(db, options)) continue; } catch (e) { onError(); }
      await new Promise<void>(resolve => { const timer = setTimeout(() => { wake = undefined; resolve(); }, 1500); wake = () => { clearTimeout(timer); resolve(); }; });
    }
  })();
  return { close: async () => { stopping = true; wake?.(); await loop; } };
}

export type KnowledgeHit = { documentId: string; originalName: string; page: number; text: string; score: number; revision: number; downloadUrl: string };

export async function searchKnowledge(db: Db, machineId: ObjectId, query: string, options: KnowledgeOptions): Promise<{ mode: string; backend: string; results: KnowledgeHit[] }> {
  if (!query.trim() || query.length > 500) throw new Error("Search must contain 1–500 characters.");
  if (!await db.collection("arture_document_records").findOne({ machineId, "knowledge.status": "ready", "knowledge.mode": options.mode }, { projection: { _id: 1 } })) return { mode: options.mode, backend: options.mode === "keyword" ? "local" : options.vectorBackend ?? "atlas", results: [] };
  const filter = { machineId, workspace: db.databaseName };
  let first: Record<string, unknown>[];
  if (options.mode === "vector") {
    const vector = (await (options.embed ?? ((texts: string[]) => embedTexts(texts, options.apiKey, options.signal)))([query]))[0];
    if (options.vectorBackend === "local") {
      first = [{ $match: { ...filter, embedding: { $exists: true } } }, { $set: { score: { $sum: { $map: { input: { $range: [0, embeddingDimensions] }, as: "i", in: { $multiply: [{ $arrayElemAt: ["$embedding", "$$i"] }, { $arrayElemAt: [{ $literal: vector }, "$$i"] }] } } } } } }, { $sort: { score: -1 } }, { $limit: 30 }];
    } else {
      try {
        first = [{ $vectorSearch: { index: vectorIndexName, path: "embedding", queryVector: vector, numCandidates: 100, limit: 30, filter } }, { $set: { score: { $meta: "vectorSearchScore" } } }];
        await db.collection("arture_knowledge_chunks").aggregate(first, { maxTimeMS: 5000 }).toArray();
      } catch {
        first = [{ $match: { ...filter, embedding: { $exists: true } } }, { $set: { score: { $sum: { $map: { input: { $range: [0, embeddingDimensions] }, as: "i", in: { $multiply: [{ $arrayElemAt: ["$embedding", "$$i"] }, { $arrayElemAt: [{ $literal: vector }, "$$i"] }] } } } } } }, { $sort: { score: -1 } }, { $limit: 30 }];
      }
    }
  } else first = [{ $match: { ...filter, $text: { $search: query } } }, { $set: { score: { $meta: "textScore" } } }, { $sort: { score: -1 } }, { $limit: 30 }];

  const found = await db.collection("arture_knowledge_chunks").aggregate([...first,
    { $lookup: { from: "arture_document_records", localField: "documentId", foreignField: "_id", as: "source" } }, { $unwind: "$source" },
    { $match: { "source.machineId": machineId, "source.knowledge.status": "ready", "source.knowledge.mode": options.mode, $expr: { $and: [{ $eq: ["$generation", "$source.knowledge.generation"] }, { $eq: ["$revision", "$source.knowledge.revision"] }] } } },
    { $limit: 6 }, { $project: { _id: 0, documentId: 1, page: 1, text: 1, score: 1, revision: 1, originalName: "$source.originalName" } },
  ], { maxTimeMS: 10_000 }).toArray();
  return { mode: options.mode, backend: options.mode === "keyword" ? "local" : options.vectorBackend ?? "atlas", results: found.map(hit => ({ documentId: hit.documentId.toHexString(), originalName: hit.originalName, page: hit.page, text: hit.text, score: hit.score, revision: hit.revision, downloadUrl: `/api/documents/${hit.documentId}/download` })) };
}

export async function triggerKnowledgeProcessing(db: Db): Promise<void> {
  const relayBase = (process.env.ARTURE_RELAY_URL || "https://arture-voice-relay.onrender.com").replace(/\/+$/, "");
  const relayKey = (process.env.ARTURE_RELAY_ACCESS_KEY || "").trim();

  if (relayBase && !relayBase.includes("localhost")) {
    fetch(`${relayBase}/api/process-job`, {
      method: "POST",
      headers: relayKey ? { Authorization: `Bearer ${relayKey}` } : {},
      signal: AbortSignal.timeout(4000),
    }).catch(() => {
      // Fire-and-forget; background worker on Render also checks MongoDB continuously
    });
  }

  try {
    await processKnowledgeJob(db, knowledgeOptions());
  } catch (err) {
    console.warn("Direct in-process knowledge processing warning:", (err as Error)?.message ?? err);
  }
}

