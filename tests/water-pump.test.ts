import { ensureKnowledgeIndexes, processKnowledgeJob, searchKnowledge, queuedKnowledge } from "../src/lib/knowledge";
import { textPdf } from "./pdf-fixture";
import { randomUUID } from "node:crypto";
import { ConversationRecorder } from "../src/lib/conversation-recorder";
import { getConversation } from "../src/lib/conversations";
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";
import { migrateWaterPump } from "../src/lib/migrate-water-pump";
import { getWorkspaceDashboard } from "../src/lib/workspace-dashboard";
import { waterPump } from "../src/lib/demo-machine";
import { hashPassword } from "../src/lib/password";

test("pump migration preserves shared data and the authenticated workspace persists real records", { timeout: 180000 }, async () => {
  const localBinary = resolve(".arture-test-mongo/mongod.exe");
  const mongo = await MongoMemoryServer.create({ binary: existsSync(localBinary) ? { systemBinary: localBinary } : undefined });
  const client = new MongoClient(mongo.getUri());
  const db = client.db("shared_phase1_test");
  let server: ReturnType<typeof spawn> | undefined;
  try {
    const now = new Date();
    const legacyId = new ObjectId();
    const realId = new ObjectId();
    const technicianId = new ObjectId();
    await db.collection("other_site_records").insertOne({ untouched: "shared database sentinel" });
    await db.collection("arture_machines").insertMany([
      { _id: legacyId, assetCode: "ATR-DEMO-001", name: "CNC Router", seedKey: "arture-demo-machine-ATR-DEMO-001-v1", archivedAt: null },
      { _id: realId, assetCode: "ATR-DEMO-002", name: "Real user machine", archivedAt: null },
      { assetCode: "ATR-DEMO-003", name: "Vacuum Former", seedKey: "arture-demo-machine-ATR-DEMO-003-v1", archivedAt: null },
    ]);
    const worker = { _id: technicianId, name: "Existing Worker", specialty: "Existing specialty", phone: "+91 90000 00001", active: true, createdAt: now, updatedAt: now };
    await db.collection("arture_technicians").insertOne(worker);
    await db.collection("arture_maintenance_logs").insertMany([
      { machineId: legacyId, seedKey: "arture-demo-router-inspection-v1", notes: "Fabricated sample", createdAt: now },
      { machineId: legacyId, technicianId, technicianName: worker.name, notes: "Real retained work", createdAt: now, serviceDate: now, minutesSpent: 10 },
    ]);
    await db.collection("arture_document_records").insertOne({ machineId: legacyId, originalName: "retained-manual.pdf", createdAt: now });
    const first = await migrateWaterPump(db);
    assert.equal(first.archivedMachines, 1);
    assert.equal(first.preservedMachinesWithRecords, 1);
    assert.equal((await db.collection("arture_machines").findOne({ _id: legacyId }))?.archivedAt, null);
    assert.equal(first.archivedSampleLogs, 1);
    assert.equal((await migrateWaterPump(db)).archivedMachines, 0);
    const migrationArgs = existsSync(".env.local") ? ["--env-file=.env.local", "--import", "tsx", "scripts/db-migrate-water-pump.ts"] : ["--import", "tsx", "scripts/db-migrate-water-pump.ts"];
    const migrationCommand = await promisify(execFile)(process.execPath, migrationArgs, {
      env: { ...process.env, ARTURE_MONGODB_URI: mongo.getUri(), ARTURE_MONGODB_DB: db.databaseName, ARTURE_ALLOW_SHARED_DATABASE: "true", ARTURE_AUTH_SECRET: "migration-test-secret", ARTURE_APP_URL: "http://localhost:3111" }, windowsHide: true,
    });
    assert.equal(JSON.parse(migrationCommand.stdout.trim()).archivedMachines, 0);
    assert.equal(await db.collection("arture_machines").countDocuments({ assetCode: waterPump.assetCode }), 1);
    assert.equal((await db.collection("arture_machines").findOne({ _id: realId }))?.archivedAt, null);
    assert.deepEqual(await db.collection("arture_technicians").findOne({ _id: technicianId }), worker);
    assert.equal(await db.collection("arture_maintenance_logs").countDocuments(), 2);
    assert.equal(await db.collection("arture_document_records").countDocuments(), 1);
    assert.equal(await db.collection("other_site_records").countDocuments({ untouched: "shared database sentinel" }), 1);
    const initial = await getWorkspaceDashboard(db, { email: "admin@arture.demo" });
    assert.equal(initial.metrics.registered, 1);
    assert.deepEqual(initial.recentActivity, []);
    assert.equal(initial.connections[waterPump.assetCode].state, "not_configured");

    const password = "Phase1-local-test-only!";
    await db.collection("arture_users").insertOne({ email: "admin@arture.demo", name: "Arture Admin", role: "admin", passwordHash: await hashPassword(password), createdAt: now, updatedAt: now });
    const port = 3111;
    let output = "";
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
      env: { ...process.env, ARTURE_MONGODB_URI: mongo.getUri(), ARTURE_MONGODB_DB: db.databaseName, ARTURE_ALLOW_SHARED_DATABASE: "true", ARTURE_APP_URL: `http://localhost:${port}`, ARTURE_AUTH_SECRET: "isolated-integration-test-secret", ARTURE_DEMO_MODE: "true", ARTURE_GUEST_LOGIN_ENABLED: "true", ARTURE_DEMO_LOGIN_EMAIL: "admin@arture.demo", ARTURE_DEMO_LOGIN_PASSWORD: password, ARTURE_KNOWLEDGE_MODE: "keyword", ARTURE_UPLOAD_MAX_BYTES: "2097152" },
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    server.stdout?.on("data", chunk => { output += chunk.toString(); });
    server.stderr?.on("data", chunk => { output += chunk.toString(); });
    const origin = `http://localhost:${port}`;
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${origin}/api/auth/session`)).ok) { ready = true; break; } } catch {}
      if (server.exitCode !== null) throw new Error(`Test server exited: ${output.slice(-3000)}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.equal(ready, true, output.slice(-3000));
    assert.equal((await fetch(`${origin}/api/dashboard`)).status, 401);
    assert.equal((await fetch(`${origin}/api/app-connections`)).status, 401);
    const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@arture.demo", password }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const prefillResponse = await fetch(`${origin}/api/auth/demo`);
    assert.match(prefillResponse.headers.get("cache-control")!, /no-store/);
    const prefill = await prefillResponse.json();
    assert.equal(prefill.email, "admin@arture.demo"); assert.equal(prefill.password, password);
    const guestLogin = await fetch(`${origin}/api/auth/guest`, { method: "POST" });
    assert.equal(guestLogin.status, 200);
    const guestCookie = guestLogin.headers.get("set-cookie")!.split(";")[0];
    const guestHeaders = { Cookie: guestCookie, "Content-Type": "application/json" };
    assert.equal((await fetch(`${origin}/api/auth/session`, { headers: guestHeaders }).then(r => r.json())).user.name, "Guest");
    const guestMachines = await fetch(`${origin}/api/machines`, { headers: guestHeaders }).then(r => r.json());
    assert.equal(guestMachines.machines.length, 1); assert.equal(guestMachines.machines[0].assetCode, waterPump.assetCode);
    assert.equal((await fetch(`${origin}/api/machines/${realId}`, { headers: guestHeaders })).status, 404);
    assert.equal((await fetch(`${origin}/api/maintenance`, { method: "POST", headers: guestHeaders, body: "{}" })).status, 403);
    assert.equal((await fetch(`${origin}/api/documents`, { method: "POST", headers: guestHeaders, body: "{}" })).status, 403);
    await fetch(`${origin}/api/auth/guest`, { method: "POST" });
    assert.equal(await db.collection("arture_users").countDocuments({ email: "guest@arture.demo" }), 1);
    const signup = await fetch(`${origin}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Pump Operator", email: "operator@example.demo", password: "operator-demo-password" }) });
    assert.equal(signup.status, 201, await signup.clone().text());
    const signupCookie = signup.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await fetch(`${origin}/api/auth/session`, { headers: { Cookie: signupCookie } }).then(r => r.json())).user.name, "Pump Operator");
    const signupMachines = await fetch(`${origin}/api/machines`, { headers: { Cookie: signupCookie } }).then(r => r.json());
    assert.equal(signupMachines.machines.length, 1); assert.equal(signupMachines.machines[0].assetCode, waterPump.assetCode);
    assert.equal((await fetch(`${origin}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Pump Operator", email: "operator@example.demo", password: "operator-demo-password" }) })).status, 409);

    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const machineResponse = await fetch(`${origin}/api/machines`, { headers });
    const { machines } = await machineResponse.json();
    assert.equal(machines.length, 1);
    assert.equal(machines[0].assetCode, waterPump.assetCode);
    assert.equal((await fetch(`${origin}/api/technicians`, { headers }).then(response => response.json())).technicians.length, 1);
    assert.equal((await fetch(`${origin}/api/machines/${realId}`, { headers })).status, 404);
    assert.equal((await fetch(`${origin}/api/machines`, { method: "POST", headers, body: JSON.stringify({ ...waterPump, assetCode: "ATR-OTHER" }) })).status, 409);
    assert.equal((await fetch(`${origin}/api/machines/${machines[0].id}`, { method: "DELETE", headers })).status, 409);
    assert.equal((await fetch(`${origin}/api/documents?machineId=${realId}`, { headers })).status, 404);
    const pumpId = machines[0].id;
    await db.collection("arture_app_connections").insertMany([
      { connectionId: "scope-check", assetCode: waterPump.assetCode, state: "connected", lastSeenAt: new Date(), endedAt: null },
      { connectionId: "hidden-machine", assetCode: "ATR-DEMO-002", state: "connected", lastSeenAt: new Date(), endedAt: null },
    ]);
    const presence = await fetch(`${origin}/api/app-connections`, { headers }).then(response => response.json());
    assert.deepEqual(Object.keys(presence.connections), [waterPump.assetCode]);
    assert.equal(presence.connections[waterPump.assetCode].state, "connected");
    await db.collection("arture_app_connections").updateOne({ connectionId: "scope-check" }, { $set: { lastSeenAt: new Date(Date.now() - 60000) } });
    const stale = await fetch(`${origin}/api/app-connections`, { headers }).then(response => response.json());
    assert.equal(stale.connections[waterPump.assetCode].state, "disconnected");
    const form = new FormData();
    const pdf = textPdf(["Impeller description for integration testing.", "Mechanical seal description."]).toString();
    form.set("machineId", pumpId);
    form.set("file", new Blob([pdf], { type: "application/pdf" }), "pump-manual.pdf");
    const upload = await fetch(`${origin}/api/documents`, { method: "POST", headers: { Cookie: cookie }, body: form });
    assert.equal(upload.status, 201, await upload.clone().text());
    const { document } = await upload.json();
    const download = await fetch(`${origin}/api/documents/${document.id}/download`, { headers });
    assert.equal(await download.text(), pdf);
    await ensureKnowledgeIndexes(db);
    assert.equal(document.knowledge.status, "queued");
    await processKnowledgeJob(db, { mode: "keyword" });
    const searchBody = JSON.stringify({ machineId: pumpId, query: "mechanical seal" });
    assert.equal((await fetch(`${origin}/api/knowledge/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: searchBody })).status, 401);
    assert.equal((await fetch(`${origin}/api/knowledge/search`, { method: "POST", headers, body: JSON.stringify({ machineId: realId.toHexString(), query: "seal" }) })).status, 404);
    assert.equal((await fetch(`${origin}/api/knowledge/search`, { method: "POST", headers, body: JSON.stringify({ machineId: pumpId, query: "" }) })).status, 400);
    const hits = await fetch(`${origin}/api/knowledge/search`, { method: "POST", headers, body: searchBody }).then(r => r.json());
    assert.equal(hits.results[0].page, 2);
    assert.equal(hits.results[0].originalName, "pump-manual.pdf");
    const replacement = new FormData(); replacement.set("file", new Blob([textPdf(["Replacement bearing description."]).toString()], { type: "application/pdf" }), "updated-pump-manual.pdf");
    const replace = await fetch(`${origin}/api/documents/${document.id}`, { method: "PUT", headers: { Cookie: cookie }, body: replacement });
    assert.equal(replace.status, 200);
    assert.equal((await searchKnowledge(db, new ObjectId(pumpId), "seal", { mode: "keyword" })).results.length, 0);
    await processKnowledgeJob(db, { mode: "keyword" });
    const retry = await fetch(`${origin}/api/documents/${document.id}/retry`, { method: "POST", headers });
    assert.equal(retry.status, 202);
    assert.equal((await fetch(`${origin}/api/documents/${document.id}/retry`, { method: "POST", headers })).status, 409);
    await processKnowledgeJob(db, { mode: "keyword" });
    const work = await fetch(`${origin}/api/maintenance`, { method: "POST", headers, body: JSON.stringify({ machineId: pumpId, technicianId: technicianId.toHexString(), serviceDate: now.toISOString(), minutesSpent: 12, notes: "Verified pump casing inspection" }) });
    assert.equal(work.status, 201, await work.clone().text());
    const dashboard = await fetch(`${origin}/api/dashboard`, { headers }).then(response => response.json());
    assert.equal(dashboard.metrics.documents, 1);
    assert.equal(dashboard.metrics.workEvents, 1);
    assert.equal(dashboard.recentActivity.length, 2);
    assert.ok(dashboard.recentActivity.some((item: { summary: string }) => item.summary.includes("updated-pump-manual.pdf")));
    assert.ok(dashboard.recentActivity.some((item: { summary: string }) => item.summary.includes("Verified pump casing inspection")));
    assert.equal((await fetch(`${origin}/api/documents`, { headers }).then(response => response.json())).documents.length, 1);
    assert.equal((await fetch(`${origin}/api/maintenance`, { headers }).then(response => response.json())).logs.length, 1);
    assert.equal((await fetch(`${origin}/api/documents/${document.id}`, { method: "DELETE", headers })).status, 204);
    assert.equal((await fetch(`${origin}/api/dashboard`, { headers }).then(response => response.json())).metrics.documents, 0);
    assert.equal((await searchKnowledge(db, new ObjectId(pumpId), "bearing", { mode: "keyword" })).results.length, 0);
    const conversationId = randomUUID();
    const recorder = new ConversationRecorder(db, conversationId, { _id: new ObjectId(pumpId), name: waterPump.name, assetCode: waterPump.assetCode }, "test", () => assert.fail("Conversation storage failed"));
    recorder.provider({ type: "conversation.item.input_audio_transcription.completed", item_id: "api-user-turn", transcript: "Pump history persists." });
    recorder.finish("completed", "app_completed"); await recorder.flush();
    const hiddenId = randomUUID();
    const hidden = new ConversationRecorder(db, hiddenId, { _id: realId, name: "Other machine", assetCode: "ATR-DEMO-002" }, "test", () => assert.fail("Conversation storage failed"));
    hidden.finish("completed", "app_completed"); await hidden.flush();
    assert.equal((await fetch(`${origin}/api/conversations?machineId=${pumpId}`)).status, 401);
    const history = await fetch(`${origin}/api/conversations?machineId=${pumpId}`, { headers }).then(response => response.json());
    assert.equal(history.sessions.length, 1);
    const saved = await fetch(`${origin}/api/conversations/${conversationId}`, { headers }).then(response => response.json());
    assert.equal(saved.events[0].text, "Pump history persists.");
    assert.equal(saved.session.status, "completed");
    assert.equal((await fetch(`${origin}/api/conversations/${hiddenId}`, { headers })).status, 404);
    assert.equal((await fetch(`${origin}/api/conversations/${conversationId}?after=invalid`, { headers })).status, 400);
    assert.equal((await fetch(`${origin}/api/conversations?machineId=${pumpId}&cursor=invalid`, { headers })).status, 400);
    const withHistory = await fetch(`${origin}/api/dashboard`, { headers }).then(response => response.json());
    assert.equal(withHistory.metrics.conversations, 1);
    assert.ok(withHistory.recentActivity.some((event: { kind: string }) => event.kind === "conversation"));
    assert.equal(await db.collection("other_site_records").countDocuments({ untouched: "shared database sentinel" }), 1);
  } finally {
    if (server) { server.kill(); await new Promise<void>(resolve => { if (server!.exitCode !== null) resolve(); else server!.once("exit", () => resolve()); }); }
    await client.close();
    await mongo.stop();
  }
});

test("migration stops when the pump identifier is already owned by real data", { timeout: 30000 }, async () => {
  const localBinary = resolve(".arture-test-mongo/mongod.exe");
  const mongo = await MongoMemoryServer.create({ binary: existsSync(localBinary) ? { systemBinary: localBinary } : undefined });
  const client = new MongoClient(mongo.getUri());
  try {
    const db = client.db("arture_collision_test");
    await db.collection("arture_machines").insertOne({ assetCode: waterPump.assetCode, name: "User-owned record" });
    await assert.rejects(migrateWaterPump(db), /non-seeded/);
    assert.equal(await db.collection("arture_machines").countDocuments(), 1);
  } finally { await client.close(); await mongo.stop(); }
});


test("local disk-backed MongoDB retains the pump and records after restart", { timeout: 60000 }, async () => {
  const dbPath = await mkdtemp(join(tmpdir(), "arture-phase1-persistence-"));
  const localBinary = resolve(".arture-test-mongo/mongod.exe");
  const options = { binary: existsSync(localBinary) ? { systemBinary: localBinary } : undefined, instance: { dbPath, storageEngine: "wiredTiger" as const } };
  let mongo = await MongoMemoryServer.create(options);
  let client = new MongoClient(mongo.getUri());
  try {
    await migrateWaterPump(client.db("arture_local_demo"));
    await client.db("arture_local_demo").collection("arture_maintenance_logs").insertOne({ notes: "Persistence test" });
    const sessionId = randomUUID();
    const machine = (await client.db("arture_local_demo").collection("arture_machines").findOne({ assetCode: waterPump.assetCode }))!;
    const conversation = new ConversationRecorder(client.db("arture_local_demo"), sessionId, { _id: machine._id, name: waterPump.name, assetCode: waterPump.assetCode }, "test", () => assert.fail("Conversation storage failed"));
    conversation.provider({ type: "conversation.item.input_audio_transcription.completed", item_id: "disk-user-turn", transcript: "Saved after restart." });
    conversation.finish("completed", "app_completed"); await conversation.flush();
    const knowledgeDb = client.db("arture_local_demo");
    await ensureKnowledgeIndexes(knowledgeDb);
    const pdfStream = new GridFSBucket(knowledgeDb, { bucketName: "arture_documents" }).openUploadStream("restart-test.pdf");
    await new Promise<void>((resolve, reject) => { pdfStream.on("finish", resolve); pdfStream.on("error", reject); pdfStream.end(textPdf(["Restart verification impeller passage."])); });
    const queued = await knowledgeDb.collection("arture_document_records").insertOne({ machineId: machine._id, gridFsFileId: pdfStream.id, originalName: "restart-test.pdf", mimeType: "application/pdf", knowledge: queuedKnowledge(), createdAt: new Date() });
    await client.db("admin").command({ fsync: 1 });
    await client.close();
    await mongo.stop({ doCleanup: false, force: false });
    mongo = await MongoMemoryServer.create(options);
    client = new MongoClient(mongo.getUri());
    assert.equal((await getConversation(client.db("arture_local_demo"), sessionId))!.events[0].text, "Saved after restart.");
    const restartedDb = client.db("arture_local_demo");
    assert.equal((await restartedDb.collection("arture_document_records").findOne({ _id: queued.insertedId }))?.knowledge.status, "queued");
    await processKnowledgeJob(restartedDb, { mode: "keyword" });
    const retrieved = await searchKnowledge(restartedDb, machine._id, "impeller", { mode: "keyword" });
    assert.equal(retrieved.results[0].originalName, "restart-test.pdf");
    assert.equal(retrieved.results[0].page, 1);

    assert.equal(await client.db("arture_local_demo").collection("arture_machines").countDocuments({ assetCode: waterPump.assetCode }), 1);
    assert.equal(await client.db("arture_local_demo").collection("arture_maintenance_logs").countDocuments({ notes: "Persistence test" }), 1);
  } finally {
    await client.close();
    await mongo.stop();
    // Only remove this test's freshly-created temporary directory.
    assert.ok(resolve(dbPath).startsWith(resolve(tmpdir()) + sep));
    assert.ok(dbPath.includes("arture-phase1-persistence-"));
    await rm(dbPath, { recursive: true, force: true });
  }
});
