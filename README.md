# Arture demo

Arture hackathon workspace: an AI spatial operating-system demo for industrial workflows. It connects machine context, manuals and SOPs, expert knowledge, work evidence, and guided operations. Root `.env` and `sample.html` stay untouched. This app only reads `ARTURE_*` values from root `.env.local`.

## Isolated configuration

1. Copy `.env.example` to `.env.local` in this repository root.
2. Create `arture_demo_dev` and a new MongoDB user limited to that database only. Do not reuse another application's unrestricted user or change its credentials.
3. Set `ARTURE_MONGODB_URI` to restricted user's URI, `ARTURE_MONGODB_DB=arture_demo_dev`, and new random `ARTURE_AUTH_SECRET`.
4. Keep `ARTURE_DEMO_MODE=true`. No `NEXT_PUBLIC_*` variable may contain secret.

Environment validation refuses databases outside `arture_*`. App uses `arture_` collections, `arture_documents` GridFS bucket, `arture_session` cookie, maximum MongoDB pool size five.

## Local run

```powershell
cd C:\Users\Dell\Documents\arture-appsite\app
npm install
npm run validate:env
npm run dev
```

Open `http://localhost:3100`.

## Remote database preparation

Run only after `.env.local` points to dedicated Arture database and restricted Arture user:

```powershell
cd C:\Users\Dell\Documents\arture-appsite\app
npm run validate:env
npm run db:indexes
$env:ARTURE_SEED_ADMIN_EMAIL="admin@arture.demo"
$env:ARTURE_SEED_ADMIN_PASSWORD="use-a-new-12-character-minimum-password"
$env:ARTURE_SEED_ADMIN_NAME="Arture Admin"
npm run db:seed
$env:ARTURE_SEED_SAMPLE_DATA="true"
npm run db:seed:sample
```

`db:indexes` creates indexes only on `arture_*` collections. `db:seed` creates admin only when email absent. `db:seed:sample` opt-in inserts three `ATR-DEMO-*` machines, three technicians, linked maintenance logs, explicit `seedKey` values. It uses `$setOnInsert`; existing records never overwritten. If user record occupies demo machine or technician identifier, no sample maintenance log attaches to it.

No script deletes data. Do not run cleanup command against connection string lacking Arture-only database user.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Admins add machines/technicians, upload/delete documents, log maintenance. Technicians view documents/log maintenance, cannot see document upload/delete controls; server routes enforce this too.

## Recovery and cleanup

To reset demo data, first export or snapshot `arture_demo_dev` if it contains retained work. Then delete only exact Arture database from MongoDB Atlas or `mongosh`, authenticated as dedicated Arture user:

```javascript
use arture_demo_dev
db.dropDatabase()
```

This removes Arture collections and `arture_documents` GridFS data inside that database. It cannot affect another application database when restricted user is used. Re-run preparation commands to recreate indexes, admin, demo data. Delete dedicated Arture MongoDB user separately when demo is retired.
