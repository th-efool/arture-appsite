# Arture demo

Standalone Next.js foundation for the Arture hackathon demo.

## Safety boundary

- Existing root `.env` and `sample.html` stay untouched.
- This app reads only `ARTURE_*` variables from `app/.env.local`.
- `ARTURE_MONGODB_DB` must start with `arture_`; environment validation rejects every other database name before database code is added.
- Database access uses a max pool of five connections and only names beginning `arture_`.
- MongoDB URI stays server-only. Never use `NEXT_PUBLIC_` for credentials.
- Collections, cookies, and seed data use `arture_` names.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a new MongoDB user restricted only to `arture_demo_dev` (or another `arture_` database). Do not reuse unrestricted credentials from another app.
3. Put its URI in `.env.local`; keep root `.env` unchanged.
4. Use a new, random `ARTURE_AUTH_SECRET`.
5. Run `npm install`, then `npm run dev`.

## Database commands

`npm run validate:env` validates Arture namespace locally and makes no network call.

`npm run db:indexes` creates only indexes on `arture_*` collections. It connects to database configured in `.env.local`.

`npm run db:seed` creates one admin only when `ARTURE_SEED_ADMIN_EMAIL` and `ARTURE_SEED_ADMIN_PASSWORD` are set. It is idempotent and does not overwrite existing users. Run `npm run db:indexes` first.

Login endpoint: `POST /api/auth/login` with JSON `{ "email", "password" }`. No public registration and no hardcoded password. `GET /api/auth/session` returns current user; `POST /api/auth/logout` expires session.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before deployment.
