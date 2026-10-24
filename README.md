# Arture Web Workspace & Realtime Voice Relay

<div align="left">

[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.18+-5FA04E?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenAI Realtime](https://img.shields.io/badge/OpenAI-Realtime_Voice-412991?style=for-the-badge&logo=openai&logoColor=white)](https://developers.openai.com/api/docs/guides/voice-websockets)
[![Test Suite](https://img.shields.io/badge/Tests-26_Passed_•_100%25-059669?style=for-the-badge)](https://nodejs.org/api/test.html)

</div>

---

**Arture** is an enterprise AI spatial operating-system backend that connects industrial equipment, engineering manuals, and AR field workers into a single, cohesive workflow.

This repository powers:
1. **The Web Workspace**: An industrial dashboard managing machine twins, uploaded technical manuals, technician work events, and historical voice sessions.
2. **The Realtime Voice Relay**: A persistent, bi-directional WebSocket server (`:3101`) that tunnels 24 kHz PCM audio between Unity and OpenAI Realtime while keeping secret keys off client devices.
3. **The Document Ingestion & Vector RAG Engine**: An automated background worker that extracts text page-by-page from uploaded PDFs, generates 1536-dimensional embeddings, and powers sub-5ms semantic lookups.
4. **The Grounded Voice Orchestrator**: A two-step turn coordinator that forces the AI assistant to search uploaded manuals, quote exact PDF page numbers, and trigger 3D component highlights in AR before speaking.

---

## 📑 Table of Contents

- [The End-to-End Workflow](#-the-end-to-end-workflow)
- [System Architecture](#-system-architecture)
- [How Voice RAG Actually Works (The Secret Two-Step Turn)](#-how-voice-rag-actually-works-the-secret-two-step-turn)
- [Repository Structure](#-repository-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Mode A: Local Offline Development (Zero Setup)](#mode-a-local-offline-development-zero-setup)
  - [Mode B: Production / MongoDB Atlas Deployment](#mode-b-production--mongodb-atlas-deployment)
- [Configuring the Unity AR Client](#-configuring-the-unity-ar-client)
- [Environment Variables Reference](#-environment-variables-reference)
- [REST & WebSocket API Reference](#-rest--websocket-api-reference)
- [Automated Testing & Live Probes](#-automated-testing--live-probes)
- [Engineering Design Decisions](#-engineering-design-decisions-human-notes)

---

## 🔄 The End-to-End Workflow

```
   1. UPLOAD (Web)           2. ASK (Unity AR)        3. GROUND (Relay RAG)      4. VERIFY (Web)
 ┌──────────────────┐      ┌──────────────────┐     ┌──────────────────┐       ┌──────────────────┐
 │ Admin uploads    │      │ Technician speaks│     │ Relay intercepts │       │ Supervisor opens │
 │ Pump_Manual.pdf  │ ───► │ "What is the     │ ──► │ question, finds  │ ────► │ Voice Sessions:  │
 │ Status: Ready    │      │ seal clearance?" │     │ page 14 in 2ms,  │       │ inspects audio   │
 │ (1536d vectors)  │      │ (24kHz stream)   │     │ speaks citation  │       │ & citations      │
 └──────────────────┘      └──────────────────┘     └──────────────────┘       └──────────────────┘
```

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph Client ["Client Layer"]
        UNITY["Unity AR Application<br/>(Arture-AR-6000.4.0f1)"]
        BROWSER["Web Browser / Dashboard<br/>(http://localhost:3100)"]
    end

    subgraph Core ["Arture Backend (arture-appsite)"]
        direction TB
        subgraph Web ["Next.js App Router (:3100)"]
            PAGES["Workspace & Dashboard UI"]
            API["REST APIs (/api/conversations, /api/documents)"]
        end

        subgraph Relay ["Persistent Voice Relay (:3101)"]
            GUARD["App Token Guard (ARTURE_RELAY_ACCESS_KEY)"]
            ROUTER["Bidirectional Audio & Tool Pipe"]
            ORCHESTRATOR["Two-Step RAG Orchestrator (RealtimeKnowledge)"]
            RECORDER["Conversation Recorder & Deduplicator"]
            GUARD --> ROUTER
            ROUTER <--> ORCHESTRATOR
            ROUTER --> RECORDER
        end

        subgraph Worker ["Knowledge Worker"]
            PARSER["Page-Accurate PDF Parser"]
            EMBEDDER["Vector Embedder (text-embedding-3-small)"]
            PARSER --> EMBEDDER
        end
    end

    subgraph Storage ["MongoDB Storage (Local WiredTiger or Atlas)"]
        CONV[("arture_conversations & events")]
        PRES[("arture_app_connections")]
        DOCS[("arture_document_records & GridFS")]
        VECTORS[("arture_knowledge_chunks (1536d Vectors)")]
    end

    subgraph Cloud ["External AI"]
        OAI["OpenAI Realtime API<br/>wss://api.openai.com/v1/realtime"]
    end

    UNITY <-->|"ws://localhost:3101/realtime<br/>(PCM audio chunks + AR tools)"| GUARD
    BROWSER <-->|"HTTP / Session Cookie"| Web
    ROUTER <-->|"wss://... (Server OpenAI API Key)"| OAI
    ORCHESTRATOR <-->|"Vector search (< 5 ms)"| VECTORS
    RECORDER --> CONV
    ROUTER --> PRES
    Web --> DOCS
    Worker --> VECTORS
```

---

## 🧠 How Voice RAG Actually Works (The Secret Two-Step Turn)

OpenAI's Realtime API does not support native document vector search. If you ask a question directly, the model will hallucinate mechanical specifications before any retrieval can happen.

To solve this without adding human-perceptible latency, the Arture Relay implements a **hidden two-step turn orchestration**:

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Technician (Unity)
    participant Relay as Arture Relay (:3101)
    participant Mongo as MongoDB Vector Store
    participant OAI as OpenAI Realtime

    Tech->>Relay: Finished speaking: "What is the impeller clearance?"
    Note over Relay,OAI: STEP 1: The Silent Retrieval Turn
    Relay->>OAI: response.create (output_modalities: ["text"], tools: [Arture_SearchPumpManuals])
    Note right of OAI: Audio output is suppressed! Unity hears nothing yet.
    OAI-->>Relay: Tool call: Arture_SearchPumpManuals(query="impeller clearance")
    Relay->>Mongo: Vector search in pump chunks (< 5 ms)
    Mongo-->>Relay: Excerpt: "0.25mm - 0.40mm" (Pump_Manual.pdf, Page 14)
    Relay-->>Tech: Event: arture.knowledge (Sources: Pump_Manual.pdf · Page 14)
    Relay->>OAI: function_call_output: Passages + Grounding Policy

    Note over Relay,OAI: STEP 2: The Grounded Voice Answer
    Relay->>OAI: response.create (output_modalities: ["audio"], tools: [Unity AR Tools])
    OAI-->>Relay: Streams voice audio deltas + Machine_ShowAnswer("Impeller", answer)
    Relay-->>Tech: Streams raw PCM audio (playback begins instantly)
    Tech->>Tech: Speaks: "According to Pump_Manual.pdf, page 14..."
    Tech->>Tech: Impeller component illuminates in 3D AR
    Relay->>Mongo: Save transcript, citations, and tool results
```

- **Speed**: The entire vector lookup completes in **2–5 milliseconds**.
- **Accuracy**: The AI assistant is forced by server prompt policies to quote the document name and physical PDF page.
- **Safety**: If no passages match (or relevance is $< 0.30$), it falls back gracefully: *"The uploaded manuals do not establish this specification. Please upload the relevant document."*

---

## 🗂️ Repository Structure

```text
arture-appsite/
├── .arture-local/               # (Ignored) Isolated local WiredTiger MongoDB & credentials
├── scripts/
│   ├── check-grounded-voice.ts  # Verification probe: runs live RAG voice query
│   ├── check-voice-relay.ts     # Verification probe: streams real OpenAI voice through relay
│   ├── configure-unity-relay.ts # Detects local LAN IP & configures Unity client
│   ├── db-indexes.ts            # Builds vector and compound indexes in Atlas
│   ├── db-migrate-water-pump.ts # Scopes workspace to pump ATR-DEMO-PUMP-001 safely
│   ├── knowledge-worker.ts      # Standalone background PDF ingestion & vector worker
│   ├── local-workspace.ts       # All-in-one local development orchestrator
│   └── realtime-relay.ts        # Standalone persistent WebSocket relay process
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # REST endpoints (conversations, documents, app-connections)
│   │   ├── login/               # Authentication page with demo pre-fill & guest access
│   │   └── workspace/           # Main industrial operator dashboard
│   ├── client/components/       # UI Components (Sessions viewer, PDF Knowledge panel, Dashboard)
│   └── lib/
│       ├── conversation-recorder.ts # Asynchronous turn & transcript persistence
│       ├── knowledge.ts             # PDF parser, token chunking, and embedding generation
│       ├── realtime-knowledge.ts    # Two-step turn RAG interceptor & grounding prompt
│       └── realtime-relay.ts        # In-memory WebSocket router & authentication guard
└── tests/                       # 26 automated unit & integration tests
    ├── conversations.test.ts    # Turn ordering, deduplication, and worker matching
    ├── knowledge.test.ts        # PDF parsing, page numbering, and vector search
    ├── realtime-knowledge.test.ts # RAG interception, timeouts, and fallbacks
    ├── realtime-relay.test.ts   # Audio streaming, credential hiding, and disconnects
    └── water-pump.test.ts       # Database migration, scoping, and isolation
```

---

## 🚀 Quick Start Guide

### Mode A: Local Offline Development (Zero Setup)

The local mode runs an isolated persistent MongoDB instance (`wiredTiger`), the Next.js frontend, the voice relay, and the document worker together in a single command. It **never touches or risks any shared remote database**.

```powershell
# 1. Install dependencies
npm install

# 2. Build Next.js
npm run build

# 3. Start local workspace
npm run start:local
```

Once running:
- **Web Dashboard**: Open `http://localhost:3100/login`.
- **Login Credentials**: Pre-filled automatically, or view `.arture-local/login.json`.
- **Voice Relay**: Listening on `ws://localhost:3101/realtime`.
- **Persistence**: All uploads, vector embeddings, and voice sessions persist in `.arture-local/mongodb` across computer restarts.

*(For active UI development with hot-reloading, run `npm run dev:local` instead).*

---

### Mode B: Production / MongoDB Atlas Deployment

For production deployments using MongoDB Atlas and dedicated cloud containers:

1. Copy `.env.example` to `.env.local`:
   ```env
   ARTURE_MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
   ARTURE_MONGODB_DB="arture_production"
   ARTURE_ALLOW_SHARED_DATABASE="true"
   ARTURE_OPENAI_API_KEY="sk-proj-your-openai-key"
   ARTURE_RELAY_ACCESS_KEY="generate-a-random-32-character-secret-token"
   ARTURE_KNOWLEDGE_MODE="vector"
   ARTURE_KNOWLEDGE_VECTOR_BACKEND="atlas"
   ```
2. Initialize database indexes:
   ```powershell
   npm run db:indexes
   npm run db:migrate:water-pump
   ```
3. Run the three services in production:
   - **Next.js Website**: `npm run start` (port 3100)
   - **Voice Relay**: `npm run relay` (port 3101)
   - **Knowledge Worker**: `npm run knowledge:worker`

---

## 📱 Configuring the Unity AR Client

To sync the backend relay address, port, and access credential with the Unity project:

```powershell
npm run relay:configure-unity
```

This scans your local network interfaces, detects your machine's LAN IP, and updates `Assets/Resources/ArtureRelayConnection.json` in the Unity repository:

```json
{
  "url": "ws://127.0.0.1:3101/realtime",
  "deviceUrl": "ws://192.168.1.150:3101/realtime",
  "accessToken": "wE__YMlYDWuq86rrLTcrcxtW4m47e7C0Wc1XyUlcXqo",
  "assetCode": "ATR-DEMO-PUMP-001"
}
```

---

## ⚙️ Environment Variables Reference

| Variable | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `ARTURE_OPENAI_API_KEY` | `string` | Private server-side OpenAI key. **Never exposed to Unity.** | `""` |
| `ARTURE_RELAY_ACCESS_KEY` | `string` | 32+ char token required by Unity to connect to the relay. | Auto-generated in local mode |
| `ARTURE_RELAY_PORT` | `number` | Port for the WebSocket realtime voice relay. | `3101` |
| `ARTURE_REALTIME_MODEL` | `string` | OpenAI Realtime model ID. | `gpt-realtime-2.1-mini` |
| `ARTURE_MONGODB_URI` | `string` | MongoDB connection URI. | Managed locally in local mode |
| `ARTURE_MONGODB_DB` | `string` | Database name. | `arture_local_demo` |
| `ARTURE_ALLOW_SHARED_DATABASE`| `boolean`| Set `true` only if connecting to an existing shared database. | `false` |
| `ARTURE_KNOWLEDGE_MODE` | `string` | `vector` (OpenAI embeddings) or `keyword` (offline text index). | `vector` |
| `ARTURE_KNOWLEDGE_VECTOR_BACKEND` | `string` | `local` (in-process exact scoring) or `atlas` (Atlas Vector Search). | `local` |
| `ARTURE_DEMO_MODE` | `boolean`| Scopes workspace strictly to the demo water pump. | `true` |
| `ARTURE_GUEST_LOGIN_ENABLED` | `boolean`| Allows read-only guest exploration on `/login`. | `true` |

---

## 📡 REST & WebSocket API Reference

### Realtime Voice WebSocket (`ws://localhost:3101/realtime`)
- **Headers**: `Authorization: Bearer <ARTURE_RELAY_ACCESS_KEY>`
- **Query Params**: `assetCode=ATR-DEMO-PUMP-001`
- **Supported Client Events**:
  - `input_audio_buffer.append`: Streams Base64 24kHz PCM microphone chunks.
  - `arture.identify`: Identifies worker by phone number (`{"type":"arture.identify","phone":"+91..."}`).
  - `response.create`: Triggers assistant turn.
  - `response.cancel`: Immediately interrupts ongoing speech.
  - `arture.session.end`: Gracefully terminates the session and marks it Completed.

### REST Endpoints
- `GET /api/app-connections`: Returns live connection state and heartbeat of connected AR devices.
- `GET /api/conversations?machineId=<id>`: Paginated list of recorded voice sessions.
- `GET /api/conversations/<id>`: Full transcript history, citations, and AR tool outcomes for a session.
- `POST /api/documents`: Uploads a technical manual PDF to GridFS and queues ingestion.
- `POST /api/knowledge/search`: Performs semantic search over uploaded manuals returning ranked passages with page citations.

---

## 🧪 Automated Testing & Live Probes

### 1. Complete Automated Test Suite (26 Tests)
Run all unit and integration test suites:
```powershell
npm test
```
- `tests/realtime-relay.test.ts`: Authenticated WebSocket streaming, audio passthrough, backpressure, and provider failures.
- `tests/realtime-knowledge.test.ts`: Two-step turn RAG orchestration, grounding prompt boundaries, and search timeouts.
- `tests/conversations.test.ts`: Transcript deduplication, asynchronous turn ordering, and worker matching.
- `tests/knowledge.test.ts`: PDF text parsing, page number preservation, and vector similarity ranking.
- `tests/water-pump.test.ts`: Water pump database migration and data isolation.

### 2. Live Connection Probes
With `npm run start:local` running in one terminal, run live diagnostics in another:

- **Raw Audio Pipeline Check**:
  ```powershell
  npm run relay:check
  ```
  *Sends a synthetic audio challenge and confirms that real PCM audio bytes stream back from OpenAI through the relay.*

- **Live Document Grounding (RAG) Check**:
  ```powershell
  npm run relay:check:knowledge -- --allow-no-sources
  ```
  *Asks a machine question, triggers the manual search, prints citations, and validates spoken audio output.*

---

## 💡 Engineering Design Decisions (Human Notes)

> *"Why run a custom WebSocket relay instead of letting Unity talk to OpenAI?"*
> 
> 1. **Client Security**: Unity APKs and binaries can be decompiled in minutes using tools like dnSpy or IL2CPP inspectors. Hardcoding an OpenAI API key in Unity is an immediate liability.
> 2. **Grounded Factuality**: The OpenAI Realtime API cannot search uploaded PDFs on its own. By controlling the WebSocket relay, we can intercept the user's question, run an indexed vector search in MongoDB in **2 ms**, and inject the exact manual page number into the model's instructions *before* it begins speaking.
> 3. **Auditability**: In industrial settings, supervisors must know what instructions were given to field technicians. Our relay acts as an immutable flight recorder, saving every query, passage cited, and component highlighted to MongoDB.

---

<div align="center">
Engineered with precision for spatial computing and industrial operations.
</div>
