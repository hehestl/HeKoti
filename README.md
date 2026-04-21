# Hekoti MVP v0.1.0

Hekoti is a lightweight open-source self-hosted wiki for public knowledge pages and admin editing.

> "Ask Hekoti and knowledge will awaken from sleep."

## Attribution

Разработано и создано by @hehestl  
https://t.me/hehestl  
https://github.com/hehestl  
https://t.me/PhiloraBot

## What is included in MVP

- Next.js App Router + TypeScript
- PostgreSQL + Prisma schema and SQL migrations
- Optional Redis cache/rate-limit fallback to memory
- Public read mode and admin write mode
- Admin login/password + TOTP 2FA
- Monaco-based markdown editor
- Built-in admin AI chat with slash commands
- Donations and AI agents configured from `.env`

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env: DATABASE_URL, HEKOTI_ADMIN_*, WEBHOOK_SECRET, etc.
docker compose up -d --build
```

### Database migrations (automatic)

On every **`hekoti-app` start**, `docker-entrypoint.sh` runs **`npx prisma migrate deploy`** using `DATABASE_URL` from your `.env`. An empty Postgres volume is fine: migrations apply before the web server binds.

- To **skip** migrations (debug only): `HEKOTI_SKIP_MIGRATE=1` in `.env`.
- **`docker compose build --no-cache`** is only for recovery (e.g. files were edited inside a running container, or a broken cached layer). After a normal `git pull`, **`docker compose up -d --build`** is enough.

### First admin user (seed)

Migrations do **not** create the admin user. After the stack is up, run once (from the repo directory on the host):

```bash
docker compose exec hekoti-app npx --yes tsx prisma/seed.ts
```

The runtime image includes `prisma/`, `bcryptjs`, and the Prisma **pg adapter** packages (`@prisma/adapter-pg` + its small `@prisma/*` deps) so this works under Next **standalone**; `npx` only fetches `tsx` if needed.

App URL: `http://localhost:3310`

## Quick start (local)

```bash
cp .env.example .env
npm install
npm run db:generate
npx prisma migrate dev
npm run db:seed   # or: npx prisma db seed
npm run dev
```

For a throwaway database without migration history you can still use `npm run db:push` instead of `migrate dev`.

## Hehestl ecosystem

HeKoti is the **identity and knowledge core** of the Hehestl digital ecosystem: a small wiki that can be self-hosted beside your other services, with optional Redis, optional LanguageTool-backed grammar checks, and admin tooling (2FA, webhooks, AI links).

## Health checks

- `GET /api/health` — combined probe (database required for `200`; Redis and LanguageTool are informational).
- `GET /api/health/live` — process up.
- `GET /api/health/ready` — database `SELECT 1`.

Point your reverse proxy at these for readiness (often `/api/health` or `/api/health/ready`).

## Spellcheck (LanguageTool)

With `LANGUAGETOOL_URL` set (see `docker-compose.yml` service `hekoti-languagetool`), admins can call:

`POST /api/spellcheck` with JSON `{ "text": "...", "language": "en-US" }` (or `"auto"`). Requires an admin session cookie.

## GitHub hygiene

Enable **Dependabot** (this repo includes `.github/dependabot.yml`). For the default branch (e.g. `hehe`), enable **branch protection** and require the **CI** workflow to pass when you are ready.

## Migration status

- `prisma/migrations/0001_init/migration.sql` — base wiki/auth schema
- `prisma/migrations/0002_agent_chat/migration.sql` — admin AI chat channels/messages

## Admin AI chat commands

- `/agent list`
- `/agent set <id>` or `/agent on <id>`
- `/ask <prompt>`
- Any plain text is treated as an ask request to the active agent

## Security baseline

- HTTP-only session cookies
- Optional TOTP verification for admin login
- Login rate-limiting
- Incoming webhook signature verification
- Internal-only Postgres/Redis in Docker compose

## Documentation

- English docs: `docs/README.en.md`
- Russian docs: `docs/README.ru.md`
- Security and hardening notes: `docs/SECURITY.en.md`

## One-click deployment templates

- `deploy/vercel.json`
- `deploy/railway.json`
- `deploy/render.yaml`
## Tech stack

Next.js (App Router), TypeScript, Prisma, PostgreSQL, optional Redis (cache + rate limits), Docker multi-stage image, optional LanguageTool in Compose.
