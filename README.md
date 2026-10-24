# Arture demo

Arture hackathon workspace: an AI spatial operating-system demo for industrial workflows. It connects machine context, manuals and SOPs, expert knowledge, work evidence, and guided operations. Root `.env` and `sample.html` stay untouched. This app only reads `ARTURE_*` values from root `.env.local`.

## Phase 1: water pump workspace

`admin@arture.demo` sees the single `ATR-DEMO-PUMP-001` water pump. The Unity `Assets/Prefabs/WaterPump.prefab` uses the same ID and name; Sample Scene inherits them. Other users retain access to their existing machine records. Worker records are unchanged.

The dashboard reads stored uploads, maintenance records, and machine activity. It refreshes every 10 seconds and has an honest empty state. The relay supplies live app connection status, saved conversations appear on each machine, and Phase 4 adds document processing and search.

Run `npm run db:migrate:water-pump` against the configured database to create the pump and archive exact legacy machine seeds and sample maintenance seeds. Nothing is deleted: workers, documents, real work records, and unrelated collections are retained. Legacy seeded machines with real uploads or non-sample work remain accessible to other users; the demo admin view still shows only the pump. The command is repeatable and stops on a conflicting user-owned pump identifier. Never reset the shared database.

### Run without the remote database

```powershell
npm install
npm run build
npm run start:local
```

Open `http://localhost:3100/login`. Local-only credentials are saved in ignored `.arture-local/login.json`. This mode creates an isolated persistent local MongoDB with the pump and the unchanged baseline worker examples. It does not connect to the shared database or copy its live records. Files and work history persist in `.arture-local/mongodb` across restarts. Use `npm run dev:local` for development instead.

The MongoDB test helper downloads a MongoDB executable on first use; `MONGOMS_SYSTEM_BINARY` can point to an installed executable. An existing `.arture-test-mongo/mongod.exe` is also supported.

### Verification

`npm run test:integration` requires a successful build. It runs real MongoDB and HTTP checks for repeatable migration, preservation of unrelated data/workers/manuals, demo machine scoping, login, upload/download, maintenance, dashboard counts, and deletion.

## Phase 2: Unity voice through Arture

Sample Scene now uses `Unity → Arture WebSocket relay → OpenAI Realtime`. The pinned model remains `gpt-realtime-2.1-mini`. The tracked Unity package is embedded at `Packages/com.convai.openai`, with original script GUIDs and the upstream license retained. It handles GA audio events/session configuration, 24 kHz PCM, one VAD/PTT commit per turn, tool continuations, and reconnection with backoff. Provider credential/quota errors stop automatic reconnect attempts until the connection is explicitly started again.

The provider API key is never sent to Unity. Configure `ARTURE_OPENAI_API_KEY` and a separate random `ARTURE_RELAY_ACCESS_KEY` in ignored `.env.local`. Unity authenticates with the app credential and the fixed pump asset code. `npm run relay:configure-unity` provisions the ignored `Assets/Resources/ArtureRelayConnection.json`; it does not copy the OpenAI key. Configure `ARTURE_RELAY_URL` for the Editor and `ARTURE_RELAY_DEVICE_URL` for a phone/headset, then rerun that command when addresses or the app credential change. For an Android device on the same LAN, the device URL must point to this PC's reachable LAN address, not localhost. Use a public `wss://` endpoint when deploying remotely.

`npm run start:local` / `npm run dev:local` now start the persistent local MongoDB, voice relay (port 3101), and website (port 3100) together. For the configured shared database, start the website normally and run `npm run relay` as a separate persistent process. The relay is not a serverless Next.js route; hosting must support a long-running process, WebSocket upgrades, and the relay's configured port or reverse-proxy route.

Only an authenticated connection for `ATR-DEMO-PUMP-001` reaches OpenAI. Audio and tool events are forwarded; credentials, audio, and transcripts are not written to the presence collection. Connection state is stored in `arture_app_connections`, with a 5-second heartbeat and a 30-second stale limit. The authenticated website polls every 5 seconds and shows connecting, connected, disconnected, or provider failure. A socket is only connected after OpenAI acknowledges its session configuration. There is no direct-to-OpenAI fallback.

Verification:

```powershell
npm run build
npm run test:integration
npm run test:relay
npm run start:local
# In another terminal, with a working OpenAI credential:
npm run relay:check
```

`relay:check` sends a synthetic text request and requires real PCM voice audio to return through the relay. It does not use the microphone or operate a real pump. `npm run relay:check -- --hold` keeps a successful check connected for 12 seconds so the website indicator can be inspected. An `invalid_api_key` result means the backend credential must be replaced, then the relay restarted. The automated relay suite uses an explicit local fake provider to verify transport/error handling independently of credits; it does not pretend to verify a live OpenAI conversation.

Phase 3 adds conversation storage and the session viewer below. RAG is not implemented yet. Local MongoDB remains isolated from the shared database.

## Phase 3: saved conversations

Open a machine and use **Voice Sessions** to review session timestamps, duration, worker, final user/assistant transcripts, AR tool arguments/results, and interrupted or failed responses. Lists and selected sessions refresh every 5 seconds and support loading older sessions/more events. The dashboard shows the session count and real session activity. Login sessions remain separate.

The relay stores metadata in `arture_conversations` and ordered entries in `arture_conversation_events`. Stable provider item IDs and tool call IDs prevent duplicate entries; repeated event IDs do not repeat streamed text. Committed speech anchors the user's turn before asynchronous transcription completes, so late transcripts retain their place. Final transcript events are saved immediately; partial text is checkpointed on the heartbeat and marked interrupted if the session ends without a final transcript. Audio bytes, authentication headers, raw provider error messages, and directory phone numbers are not written to conversation history. Structured tool fields that look like credentials are redacted.

Unity sends `arture.session.end` on a normal stop and the recorder saves **Completed**. Unexpected closure saves **Disconnected**, and provider/transport failures save **Failed** with the reason. Stale open sessions appear disconnected after 30 seconds; relay startup reconciles their stored status. Reconnection creates a new session rather than silently merging separate calls. Session state survives local database/service restarts. Failed connection attempts may have no transcript; the viewer says so instead of inventing one.

Worker assignment is optional. Set `ARTURE_WORKER_PHONE` in ignored `.env.local` and run `npm run relay:configure-unity`, or call Unity's `RealtimeConversationManager.IdentifyWorker(phone)` at session start. The relay matches one active directory record and stores only its ID/name. Unknown or ambiguous matches remain **Unassigned**. This is a directory match through the already-authenticated app, not proof of the individual worker's identity. An established match cannot relabel the same session as another worker. `arture.identify` messages are consumed by Arture and never forwarded to OpenAI.

Authenticated read APIs:

- `GET /api/conversations?machineId=<id>&cursor=<optional cursor>` returns 50 sessions per page.
- `GET /api/conversations/<session UUID>?after=<optional sequence>` returns 200 events per page.

Both enforce the same machine visibility as the workspace. `npm run test:conversations` verifies deduplication, ordering, partial failures, interruptions, directory matching and pagination. `npm run test:relay` covers the complete WebSocket recording path; `npm run test:integration` covers authenticated history reads, machine scoping and disk persistence.

A valid `ARTURE_OPENAI_API_KEY` is still required to record real voice transcripts. Provider rejection is itself saved as a failed session. Automated tests use an explicit local provider fixture and do not seed fictional conversation transcripts into the user's workspace.

## Phase 4: searchable machine knowledge

Upload a text PDF from the pump page. The site saves the file and a durable processing job together, then the background worker extracts text in a separate memory-limited process, keeps physical PDF page numbers, splits it into overlapping passages, and embeds batches with `text-embedding-3-small` (1536 dimensions). The page shows queued, processing, ready, or failed, with useful errors, retry, replacement, deletion, and a search panel with filename/page citations. PNG/JPEG files remain downloadable; images and scanned PDFs clearly report that OCR is required. Limits: 2 MB upload by default, 200 PDF pages, 1000 passages per document, and a 35-second extraction timeout. No OCR or image understanding is claimed.

The document record in `arture_document_records` is also the persistent job. Atomic claim tokens, renewable leases and conditional publication prevent competing workers or an old version from becoming searchable. A stopped worker's jobs can resume after their 90-second lease expires. Existing uploads are queued on worker startup. Replacements and retries invalidate their previous generation immediately; deletion removes authoritative metadata before chunk/file cleanup. Retrieval rechecks document generation, revision, machine, and ready status, so stale Atlas index entries cannot return a replaced/deleted document. Workers and unrelated collections are preserved. This app currently has one workspace per database; both database-name workspace and machine filters are applied to chunks. A future multi-tenant workspace model must add its own membership checks.

`arture_knowledge_chunks` stores extracted passages, citations and embeddings. All collection and GridFS names remain Arture-prefixed. Provider keys and embedding vectors are never sent to the browser. Upload/replace/retry/delete require admin access; authenticated searches and downloads enforce the same machine visibility as the workspace.

**Local demo:** `npm run start:local` starts MongoDB, the document worker, the relay and website together. With `ARTURE_OPENAI_API_KEY`, documents use real OpenAI embeddings stored in persistent local MongoDB, with exact vector scoring for the small demo corpus. The search panel labels this **Semantic search · Local MongoDB**. This requires an internet connection to OpenAI, but no Atlas connection. Set `ARTURE_KNOWLEDGE_MODE=keyword` to use MongoDB's real text index without embeddings. A mode change requeues ready documents at worker startup. Local exact scoring is for the hackathon corpus; use Atlas indexing for larger collections.

**Atlas deployment:** set `ARTURE_KNOWLEDGE_MODE=vector` and `ARTURE_KNOWLEDGE_VECTOR_BACKEND=atlas`, run `npm run db:indexes`, and run `npm run knowledge:worker` alongside the website and relay. The worker needs a persistent Node.js process, installed dependencies, and the repository root as its working directory. The index is `arture_pump_vectors_v1`, type `vectorSearch`, on `arture_knowledge_chunks`, with a 1536-dimensional cosine vector field `embedding` and filter fields `workspace` and `machineId`. Startup creates it if absent; the database user needs search-index permissions. Atlas index creation and new records become queryable asynchronously; processing-ready means passages/vectors were persisted, not that Atlas has finished indexing. Search reports an unavailable state if the service/index is unavailable. The live Atlas path still needs validation once network access is restored.

API: `PUT /api/documents/<id>` replaces a file using multipart `file`; `POST /api/documents/<id>/retry` queues processing; `POST /api/knowledge/search` accepts `{ "machineId": "...", "query": "..." }` and returns the actual mode/backend and up to six passages with document ID, revision, filename, page and protected download URL. Phase 5 uses this same retrieval function inside the voice relay.

Run `npm run test:knowledge` for real PDF parsing, chunk limits, durable jobs, failure/retry, expired leases, competing workers, stale-version/deletion exclusion and semantic ranking with explicitly isolated fixture vectors. `npm run test:integration` also verifies authenticated upload/search/replace/retry/delete through the built website. Tests never populate the local user's workspace or call OpenAI unless a separate live verification is explicitly run.

## Phase 5: document-grounded Unity voice

The pump conversation now follows `Unity → Arture relay → manual retrieval → OpenAI answer → Unity audio/AR tools`. The relay adds a server-owned `Arture_SearchPumpManuals` function and forces a text-only search response at the start of each user turn. Its intermediate text/audio events are hidden, so speech starts only after retrieval. The model derives the query directly from its current audio/text context, so late speech transcription does not race retrieval. Arture fixes the machine ID from the authenticated pump connection; function arguments cannot choose another machine or workspace.

After `response.done`, Arture returns up to four relevant passages with source IDs, document names, physical PDF page numbers and versions. It then creates one continuation with the original Unity instructions and AR tools. Search function calls and their intermediate response completion never reach Unity's AR executor. Follow-up AR tool continuations retain the same turn's evidence; new user turns force a fresh search. Duplicate completions do not execute retrieval twice. Cancellation, new speech and disconnect invalidate pending retrieval; late results cannot start an old answer. Searches have a 12-second budget and propagate cancellation to embedding requests.

The model is instructed to treat document text and filenames as untrusted evidence, to cite file/page in speech and `Machine_ShowAnswer.answer`, and to state when the manuals do not establish an answer. Semantic passages below a 0.30 similarity score are excluded. No documents, irrelevant passages or unavailable search produce an explicit fallback, rather than fabricated operating values. Model adherence still needs domain review for real maintenance use; retrieval is evidence supplied to the model, not a guarantee that every generated sentence is supported.

Unity receives `arture.knowledge` statuses and exposes `KnowledgeStatus`, `KnowledgeSourcesSummary` and `onKnowledgeStatus`. Its answer labels append retrieved references, or display a clear no-source/unavailable message. Existing component discovery, highlighting and tool outcome handling remain active. The website session viewer records each manual query, outcome, latency, retrieval backend and returned filename/page/version/excerpt alongside transcripts and AR actions. These are historical evidence snapshots; replacing/deleting a document excludes it from future searches while preserving what a past session received. The viewer distinguishes sources returned from claims the model actually made.

Local startup runs the website, relay, document worker and persistent MongoDB together. For deployment, run the website, `npm run relay`, and `npm run knowledge:worker` as persistent services with matching database/search configuration. Unity still only receives its app credential, never the OpenAI key. Use the deployed `wss://` relay URL for devices and rerun `npm run relay:configure-unity` after changing its address. The Atlas configuration from Phase 4 is unchanged; local semantic scoring supports the hackathon while Atlas is unreachable.

Verification: `npm run test:voice-knowledge` covers forced retrieval, preserved AR tools, pump binding, source records, prompt-injection boundaries, fallback, deduplication, cancellation and deadlines. `npm run test:relay` includes a complete isolated WebSocket + real PDF + MongoDB grounding session with AR output and saved citations. Both affected Unity assemblies compile against the project's Unity references; device microphone/AR execution still requires running Sample Scene on the target device.

For a live check, upload a relevant text PDF, wait for Ready, then run `npm run relay:check:knowledge`. It sends a text question through the actual relay, requires a retrieval result and real OpenAI PCM audio, prints the answer and returned references, and closes as Completed. `ARTURE_KNOWLEDGE_CHECK_QUESTION` changes the question; `ARTURE_KNOWLEDGE_CHECK_EXPECT` optionally requires a known fact in the answer. `-- --allow-no-sources` explicitly tests the missing-document fallback. The check does not seed documents or imitate provider output. An actual microphone question in Unity uses the same retrieval/continuation path.

## Lightweight integration API

No JWT is required for the demo. Configure `ARTURE_INGEST_KEY` to protect these endpoints with the `x-arture-ingest-key` header; when it is unset, they are open for local hackathon use.

```bash
# Verify the phone belongs to one registered worker.
curl "http://localhost:3100/api/workers/lookup?phone=%2B91%2090000%2000001"

# Record that the verified worker completed a task. Use systemId or assetCode.
curl -X POST http://localhost:3100/api/work-events \
  -H "Content-Type: application/json" \
  -d '{"phone":"+91 90000 00001","assetCode":"ATR-DEMO-PUMP-001","task":"Completed pump inspection","details":"Visual inspection complete.","minutesSpent":30}'
```

The lookup returns the worker name or `404`. Work events are stored in the Arture maintenance/event timeline, linked to the matched worker and connected system.

## Isolated configuration

1. Copy `.env.example` to `.env.local` in this repository root.
2. Prefer a dedicated `arture_demo_dev` database. For the authorized shared database, use its connection in ignored `.env.local`, set its exact database name, and set `ARTURE_ALLOW_SHARED_DATABASE=true`. Do not change existing database credentials.
3. Set `ARTURE_MONGODB_URI` to restricted user's URI, `ARTURE_MONGODB_DB=arture_demo_dev`, and new random `ARTURE_AUTH_SECRET`.
4. Keep `ARTURE_DEMO_MODE=true`. No `NEXT_PUBLIC_*` variable may contain secret.

Environment validation requires an `arture_*` database by default. An intentionally shared database requires `ARTURE_ALLOW_SHARED_DATABASE=true`; collections and the GridFS bucket still use the `arture_` prefix. App uses `arture_` collections, `arture_documents` GridFS bucket, `arture_session` cookie, maximum MongoDB pool size five.

## Local run

```powershell
cd C:\Users\Admin\Documents\GitHub\arture-appsite
npm install
npm run validate:env
npm run dev
```

Open `http://localhost:3100`.

## Remote database preparation

Run only after `.env.local` points to dedicated Arture database and restricted Arture user:

```powershell
cd C:\Users\Admin\Documents\GitHub\arture-appsite
npm run validate:env
npm run db:indexes
$env:ARTURE_SEED_ADMIN_EMAIL="admin@arture.demo"
$env:ARTURE_SEED_ADMIN_PASSWORD="use-a-new-12-character-minimum-password"
$env:ARTURE_SEED_ADMIN_NAME="Arture Admin"
npm run db:seed
$env:ARTURE_SEED_SAMPLE_DATA="true"
npm run db:seed:sample
```

`db:indexes` creates indexes only on `arture_*` collections. `db:seed` creates admin only when email absent. `db:seed:sample` ensures the water pump and the existing three sample workers. It creates no fictional maintenance history and preserves existing worker records. If user record occupies demo machine or technician identifier, no sample maintenance log attaches to it.

Preparation scripts preserve existing data. Document replacement/deletion and retry remove the affected Arture file or passage generations. Never run a database cleanup against a shared database.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Admins add machines/technicians, upload/delete documents, log maintenance. Technicians view documents/log maintenance, cannot see document upload/delete controls; server routes enforce this too.

## Recovery

The water pump migration archives known sample records without deleting them. Restore retained records by their exact IDs if needed. Never drop the shared database or remove unrelated collections. Local development data is confined to the ignored `.arture-local` directory.

## Demo login and guest access

`npm run start:local` fills `/login` with the actual credentials from ignored `.arture-local/login.json`. It exposes only that explicitly enabled demo login through an uncached endpoint; credentials are never embedded in committed frontend code. Other deployments leave autofill disabled unless both `ARTURE_DEMO_MODE=true` and `ARTURE_DEMO_LOGIN_EMAIL` / `ARTURE_DEMO_LOGIN_PASSWORD` are deliberately configured.

The **Log in as guest** button creates a normal cookie session for a single read-only guest account. Local startup enables it automatically. Other demo deployments can opt in with `ARTURE_GUEST_LOGIN_ENABLED=true`; it also requires demo mode. Guests can view/search the pump's documents and sessions, but cannot edit records, upload files or log work. Existing workers and admin credentials are preserved.
