# Nexus — Copilot Instructions 🚀

## Quick high-level architecture

- Backend: TypeScript (Bun) server (entry: `core/src/server.ts`) using Hono for routing and `core/src/*` packages for domain logic (`db`, `api`, `auth`, `health`). Migrations live under `db/migrations` and are managed via `scripts/migrate.go`.
- Frontend: Next.js app in `web/` (dev via `pnpm dev`, build via `pnpm build`). The client resolves API base URL from `localStorage:nexus_server_url` or `window.location.origin` (`web/src/lib/api-client.ts`).
- Data & persistence: `data/` (icons -> `data/icons`), MySQL (primary DB) and ClickHouse (metrics/uptime). Docker Compose mounts a persistent `nexus-data` volume.

## Essential developer workflows ✅

- Dev (backend + frontend):
  - `make dev-backend` (starts Bun dev server with hot-reload) and `make dev-frontend` (starts Next.js dev server).
  - Or `make dev` to start both concurrently.
- Run migrations (Drizzle):
  - Run migrations: `make migrate` or `cd core && bun run db:migrate`.
  - Generate new migrations: `make migrate-generate` or `cd core && bun run db:generate`.
  - Open Drizzle Studio: `make migrate-studio` or `cd core && bun run db:studio`.
- Production with Docker: `make prod` or `docker compose -f docker-compose.prod.yml up -d`.

## Important environment variables & gotchas ⚠️

- DB: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` (used by `make migrate` and server).
- WebAuthn (passkeys): `WEBAUTHN_RP_NAME`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_ORIGIN` — must match real host/origin for passkeys to work (browsers require secure origins). See `core/src/auth/webauthn.ts` for defaults used in dev.
- Ports: server reads `API_PORT` (defaults to `8080`) — Docker `core` service listens on port `8080`. When debugging locally, confirm the container port mapping and use `nexus_server_url` in the frontend to point to the correct origin.
- Static assets: server serves `web/dist` and `/icons/*` (icons are stored in `data/icons` and are persisted via the Docker volume).

## Project conventions & implementation details 🔧

- DB access: `core/src/db/mysql.ts` exposes Drizzle ORM client and uses a single connection pool plus a task queue (`core/src/db/task-queue.ts`) to serialize write operations.
- Migrations: Managed via Drizzle (`core/src/db/migrate.ts`). Migrations are generated from schema changes (`bun run db:generate`) and stored in `core/drizzle/`. Run with `bun run db:migrate`.
- Auth: WebAuthn sessions are stored in-memory (`core/src/auth/webauthn.ts`) — ephemeral and intended for the scaffold (use caution when testing concurrent flows).
- API routing: REST handlers live in `core/src/api` and are registered in `core/src/server.ts` (e.g., service handlers, auth handlers). Use these files as examples when adding endpoints.
- Frontend API usage: `web/src/lib/api-client.ts` uses a simple `fetch` wrapper — the UI expects standard REST JSON responses and throws on non-ok responses.

## Where to look for examples & edits 📁

- Server entry & routing: `core/src/server.ts` (startup, middleware, static file serving)
- DB patterns & migrations: `core/src/db/mysql.ts`, `core/src/db/schema.ts`, and `core/src/db/migrate.ts`
- Auth / Passkeys: `core/src/auth/webauthn.ts` and `core/src/auth/handlers.ts`
- API examples: `core/src/api/services.ts`, `core/src/api/icons.ts`, `core/src/api/users.ts`
- Frontend: `web/src/lib/api-client.ts`, `web/src/lib/api.ts` and pages/components under `web/src`

---

If any section is unclear or you'd like additional examples (e.g., step-by-step for adding a new migration, creating a new API route, or reproducing WebAuthn locally), tell me which area to expand and I'll iterate. ✅
