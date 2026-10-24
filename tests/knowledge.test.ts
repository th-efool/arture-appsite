import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, ObjectId, GridFSBucket, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chunkPages, ensureKnowledgeIndexes, extractPdf, processKnowledgeJob, queuedKnowledge, retryKnowledge, searchKnowledge, startKnowledgeWorker, embeddingDimensions, embedTexts, embeddingModel } from "../src/lib/knowledge";
import { textPdf } from "./pdf-fixture";

let mongo: MongoMemoryServer; let client: MongoClient; let serial = 0;
before(async () => {
  const binary = resolve(".arture-test-mongo/mongod.exe");
  mongo = await MongoMemoryServer.create({ binary: existsSync(binary) ? { systemBinary: binary } : undefined });
  client = new MongoClient(mongo.getUri());
});
after(async () => { await client?.close(); await mongo?.stop(); });
async function setup() { const db = client.db(`arture_knowledge_test_${++serial}`); await ensureKnowledgeIndexes(db); return db; }
async function upload(db: Db, machineId: ObjectId, bytes = textPdf(["The impeller is described on the first page.", "A second page describes the mechanical seal."]), mimeType = "application/pdf") {
  const stream = new GridFSBucket(db, { bucketName: "arture_documents" }).openUploadStream("test-manual.pdf");
  await new Promise<void>((resolve, reject) => { stream.on("finish", resolve); stream.on("error", reject); stream.end(bytes); });
  const doc = { _id: new ObjectId(), machineId, gridFsFileId: stream.id, originalName: "test-manual.pdf", mimeType, knowledge: queuedKnowledge(), createdAt: new Date() };
  await db.collection("arture_document_records").insertOne(doc); return doc;
}
test("valid PDF extraction retains physical page numbers and bounded overlapping chunks", async () => {
  const pages = await extractPdf(textPdf(["Impeller first page", "Mechanical seal second page"]));
  assert.equal(pages.length, 2); assert.equal(pages[1].num, 2); assert.match(pages[1].text, /Mechanical seal/);
  const chunks = chunkPages([{ num: 9, text: "impeller ".repeat(500) }]);
  assert.ok(chunks.length > 2); assert.ok(chunks.every(c => c.text.length <= 1500 && c.page === 9));
  assert.ok(chunks[0].text.endsWith(chunks[1].text.slice(0, 180)));
  assert.throws(() => chunkPages([{ num: 1, text: "   " }]), /OCR/);
  await assert.rejects(extractPdf(Buffer.from("%PDF-1.4\ninvalid\n%%EOF")), /Cannot read/);
});
test("durable extraction and keyword search return page citations with machine and workspace isolation", async () => {
  const db = await setup(); const machineId = new ObjectId(); const other = new ObjectId();
  const doc = await upload(db, machineId); await upload(db, other);
  assert.equal(await processKnowledgeJob(db, { mode: "keyword" }), true);
  const ready = await db.collection("arture_document_records").findOne({ _id: doc._id });
  assert.equal(ready?.knowledge.status, "ready"); assert.equal(ready?.knowledge.pages, 2);
  const found = await searchKnowledge(db, machineId, "mechanical seal", { mode: "keyword" });
  assert.equal(found.results.length, 1); assert.equal(found.results[0].page, 2); assert.equal(found.results[0].documentId, doc._id.toHexString());
  assert.match(found.results[0].downloadUrl, /download$/);
  assert.equal((await searchKnowledge(db, other, "mechanical seal", { mode: "keyword" })).results.length, 0);
  await db.collection("arture_knowledge_chunks").updateMany({ documentId: doc._id }, { $set: { workspace: "another-workspace" } });
  assert.equal((await searchKnowledge(db, machineId, "seal", { mode: "keyword" })).results.length, 0);
});
test("images, scans, bad PDFs and embedding failures remain downloadable and can be retried", async () => {
  const db = await setup(); const machineId = new ObjectId();
  const image = await upload(db, machineId, Buffer.from("image"), "image/png");
  await processKnowledgeJob(db, { mode: "keyword" });
  assert.match((await db.collection("arture_document_records").findOne({ _id: image._id }))?.knowledge.error, /OCR/);
  const doc = await upload(db, machineId);
  await processKnowledgeJob(db, { mode: "vector", extract: async () => [{ num: 1, text: "" }] });
  assert.match((await db.collection("arture_document_records").findOne({ _id: doc._id }))?.knowledge.error, /No readable text/);
  await retryKnowledge(db, doc._id);
  assert.equal(await retryKnowledge(db, doc._id), false);
  await processKnowledgeJob(db, { mode: "vector", embed: async () => { throw new Error("OpenAI rejected the embedding key."); } });
  assert.equal((await db.collection("arture_document_records").findOne({ _id: doc._id }))?.knowledge.status, "failed");
  assert.equal(await db.collection("arture_knowledge_chunks").countDocuments({ documentId: doc._id }), 0);
  await retryKnowledge(db, doc._id); await processKnowledgeJob(db, { mode: "keyword" });
  assert.equal((await db.collection("arture_document_records").findOne({ _id: doc._id }))?.knowledge.status, "ready");
});
test("replaced and deleted documents never return outdated chunks, including a worker publication race", async () => {
  const db = await setup(); const machineId = new ObjectId(); const doc = await upload(db, machineId);
  await processKnowledgeJob(db, { mode: "keyword" });
  // Simulate metadata replacement before index/chunk cleanup: old chunks remain in storage.
  await db.collection("arture_document_records").updateOne({ _id: doc._id }, { $set: { knowledge: queuedKnowledge(2) } });
  assert.equal((await searchKnowledge(db, machineId, "impeller", { mode: "keyword" })).results.length, 0);
  let release!: () => void; let entered!: () => void;
  const started = new Promise<void>(r => { entered = r; }); const blocked = new Promise<void>(r => { release = r; });
  const processing = processKnowledgeJob(db, { mode: "keyword", extract: async () => { entered(); await blocked; return [{ num: 1, text: "replacement impeller" }]; } });
  await started; await db.collection("arture_document_records").deleteOne({ _id: doc._id }); release(); await processing;
  assert.equal((await searchKnowledge(db, machineId, "impeller", { mode: "keyword" })).results.length, 0);
  // The worker never publishes a new generation after deletion.
  assert.equal(await db.collection("arture_knowledge_chunks").countDocuments({ documentId: doc._id, revision: 2 }), 0);
});
test("expired leases resume after restart; only one worker can claim a job", async () => {
  const db = await setup(); const machineId = new ObjectId(); const doc = await upload(db, machineId);
  await db.collection("arture_document_records").updateOne({ _id: doc._id }, { $set: { "knowledge.status": "processing", "knowledge.generation": "stopped-worker", "knowledge.leaseUntil": new Date(0) } });
  const results = await Promise.all([processKnowledgeJob(db, { mode: "keyword" }), processKnowledgeJob(db, { mode: "keyword" })]);
  assert.equal(results.filter(Boolean).length, 1);
  const ready = await db.collection("arture_document_records").findOne({ _id: doc._id });
  assert.equal(ready?.knowledge.status, "ready"); assert.notEqual(ready?.knowledge.generation, "stopped-worker");
  const queued = await upload(db, machineId);
  const worker = await startKnowledgeWorker(db, { mode: "keyword" });
  for (let i = 0; i < 100; i++) { if ((await db.collection("arture_document_records").findOne({ _id: queued._id }))?.knowledge.status === "ready") break; await new Promise(r => setTimeout(r, 100)); }
  await worker.close();
  assert.equal((await db.collection("arture_document_records").findOne({ _id: queued._id }))?.knowledge.status, "ready");
});
test("local semantic retrieval ranks persisted vectors and excludes other machines", async () => {
  const db = await setup(); const machineId = new ObjectId(); const doc = await upload(db, machineId);
  // Deterministic unit vectors are test fixtures, never inserted into the demo database.
  const vector = (dimension: number) => Array.from({ length: embeddingDimensions }, (_, i) => i === dimension ? 1 : 0);
  const embed = async (texts: string[]) => texts.map(text => vector(text.includes("seal") ? 1 : 0));
  await processKnowledgeJob(db, { mode: "vector", embed });
  const result = await searchKnowledge(db, machineId, "seal", { mode: "vector", vectorBackend: "local", embed });
  assert.equal(result.backend, "local"); assert.equal(result.results[0].page, 2); assert.equal(result.results[0].score, 1);
  assert.equal((await searchKnowledge(db, new ObjectId(), "seal", { mode: "vector", vectorBackend: "local", embed })).results.length, 0);
  await db.collection("arture_document_records").deleteOne({ _id: doc._id });
  assert.equal((await searchKnowledge(db, machineId, "seal", { mode: "vector", vectorBackend: "local", embed })).results.length, 0);
});

test("embedding requests use the configured contract, retry a transient outage, and reject invalid credentials/vectors", async context => {
  let calls = 0;
  const vectors = [Array(embeddingDimensions).fill(0), Array(embeddingDimensions).fill(1)];
  const stub = context.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/embeddings");
    const request = JSON.parse(init.body as string);
    assert.equal(request.model, embeddingModel); assert.equal(request.dimensions, embeddingDimensions);
    assert.deepEqual(request.input, ["first passage", "second passage"]);
    if (++calls === 1) throw new TypeError("Transient network failure");
    return Response.json({ data: [{ index: 1, embedding: vectors[1] }, { index: 0, embedding: vectors[0] }] });
  });
  assert.deepEqual(await embedTexts(["first passage", "second passage"], "isolated-test-key"), vectors);
  assert.equal(calls, 2);
  stub.mock.mockImplementation(async () => Response.json({ error: {} }, { status: 401 }));
  await assert.rejects(embedTexts(["test"], "isolated-test-key"), /rejected the embedding key/);
  stub.mock.mockImplementation(async () => Response.json({ data: [{ index: 0, embedding: [0] }] }));
  await assert.rejects(embedTexts(["test"], "isolated-test-key"), /invalid vectors/);
  await assert.rejects(embedTexts(["test"]), /missing/);
});
