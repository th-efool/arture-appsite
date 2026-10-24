import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { MongoClient } from "mongodb";
import { startRealtimeRelay } from "../src/lib/realtime-relay";
import { MongoMemoryServer } from "mongodb-memory-server";
import { hashPassword } from "../src/lib/password";
import { migrateWaterPump } from "../src/lib/migrate-water-pump";
import { artureDemoTechnicians } from "../src/lib/sample-data";
import { startKnowledgeWorker } from "../src/lib/knowledge";

// Explicit offline development mode. Never reads or connects to the shared database.
async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const knowledgeMode = process.env.ARTURE_KNOWLEDGE_MODE ?? (process.env.ARTURE_OPENAI_API_KEY ? "vector" : "keyword");
  if (knowledgeMode !== "vector" && knowledgeMode !== "keyword") throw new Error("Invalid knowledge mode.");
  const directory = resolve(".arture-local");
  const dbPath = resolve(directory, "mongodb");
  await mkdir(dbPath, { recursive: true });
  const credentialPath = resolve(directory, "login.json");
  const credentials = existsSync(credentialPath)
    ? JSON.parse(await readFile(credentialPath, "utf8")) as { email: string; password: string }
    : { email: "admin@arture.demo", password: randomBytes(18).toString("base64url") };
  await writeFile(credentialPath, JSON.stringify(credentials, null, 2) + "\n");
  const binaryPath = resolve(".arture-test-mongo/mongod.exe");
  const mongo = await MongoMemoryServer.create({
    binary: existsSync(binaryPath) ? { systemBinary: binaryPath } : undefined,
    instance: { dbPath, storageEngine: "wiredTiger", ip: "127.0.0.1" },
  });
  const localUri = mongo.getUri() + "?journal=true";
  const client = new MongoClient(localUri);
  try {
    const db = client.db("arture_local_demo");
    const now = new Date();
    await db.collection("arture_machines").createIndex({ assetCode: 1 }, { unique: true });
    await db.collection("arture_users").createIndex({ email: 1 }, { unique: true });
    await db.collection("arture_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await migrateWaterPump(db);
    if (!await db.collection("arture_users").findOne({ email: credentials.email })) {
      await db.collection("arture_users").insertOne({ email: credentials.email, name: "Arture Admin", role: "admin", passwordHash: await hashPassword(credentials.password), createdAt: now, updatedAt: now });
    }
    for (const worker of artureDemoTechnicians) {
      await db.collection("arture_technicians").updateOne({ name: worker.name }, { $setOnInsert: { ...worker, createdAt: now, updatedAt: now } }, { upsert: true });
    }
  } catch (error) {
    await mongo.stop({ doCleanup: false, force: false });
    throw error;
  } finally { await client.close(); }
  const relayKeyPath = resolve(directory, "relay-access-key.txt");
  const relayKey = process.env.ARTURE_RELAY_ACCESS_KEY ?? (existsSync(relayKeyPath) ? (await readFile(relayKeyPath, "utf8")).trim() : randomBytes(32).toString("base64url"));
  await writeFile(relayKeyPath, relayKey + "\n");
  const relayClient = new MongoClient(localUri);
  // Local mode persists real OpenAI vectors without requiring the Atlas search service.
  const knowledgeWorker = await startKnowledgeWorker(relayClient.db("arture_local_demo"), { mode: knowledgeMode, vectorBackend: "local", apiKey: process.env.ARTURE_OPENAI_API_KEY }).catch(async error => {
    await relayClient.close(); await mongo.stop({ doCleanup: false, force: false }); throw error;
  });
  const relay = await startRealtimeRelay({ db: relayClient.db("arture_local_demo"), apiKey: process.env.ARTURE_OPENAI_API_KEY ?? "", accessKey: relayKey, model: process.env.ARTURE_REALTIME_MODEL, port: Number(process.env.ARTURE_RELAY_PORT ?? 3101), knowledge: { mode: knowledgeMode, vectorBackend: "local", apiKey: process.env.ARTURE_OPENAI_API_KEY } }).catch(async error => {
    await knowledgeWorker.close(); await relayClient.close(); await mongo.stop({ doCleanup: false, force: false }); throw error;
  });
  console.log(`Arture voice relay: ws://localhost:${relay.port}/realtime (OpenAI configured: ${!!process.env.ARTURE_OPENAI_API_KEY}).`);
  console.log("Local Arture workspace: http://localhost:3100/login");
  console.log("Local-only login saved in .arture-local/login.json. Data persists in .arture-local/mongodb.");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.argv.includes("--dev") ? "dev" : "start", "-p", "3100"], {
    env: { ...process.env, ARTURE_KNOWLEDGE_MODE: knowledgeMode, ARTURE_KNOWLEDGE_VECTOR_BACKEND: "local", ARTURE_MONGODB_URI: localUri, ARTURE_MONGODB_DB: "arture_local_demo", ARTURE_ALLOW_SHARED_DATABASE: "false", ARTURE_APP_URL: "http://localhost:3100", ARTURE_AUTH_SECRET: "arture-local-" + credentials.password, ARTURE_DEMO_MODE: "true", ARTURE_DEMO_LOGIN_EMAIL: credentials.email, ARTURE_DEMO_LOGIN_PASSWORD: credentials.password, ARTURE_GUEST_LOGIN_ENABLED: "true", ARTURE_UPLOAD_MAX_BYTES: "2097152", ARTURE_INGEST_KEY: randomBytes(24).toString("hex"), ARTURE_RELAY_ENABLED: process.env.ARTURE_OPENAI_API_KEY ? "true" : "false" },
    stdio: "inherit", windowsHide: true,
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.kill();
    await relay.close();
    await knowledgeWorker.close();
    await relayClient.close();
    const flushClient = new MongoClient(localUri);
    try { await flushClient.db("admin").command({ fsync: 1 }); }
    finally {
      await flushClient.close();
      await mongo.stop({ doCleanup: false, force: false });
    }
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  server.once("error", () => { void stop().finally(() => { process.exitCode = 1; }); });
  server.once("exit", code => { void stop().then(() => { process.exitCode = code ?? 0; }); });
}

main().catch(() => { console.error("Local workspace could not start. Check the MongoDB executable and whether port 3100 is free."); process.exitCode = 1; });
