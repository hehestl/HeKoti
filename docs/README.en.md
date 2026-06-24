# Hekoti Documentation (EN)

## Overview

Hekoti is an open-source self-hosted wiki focused on speed, simple operations, and admin productivity.

Main use cases:

- Public documentation pages with clean slugs
- Admin-only editing and moderation
- In-app AI assistant chat for writing, translation, and research support

## Architecture

- Frontend + API: Next.js App Router
- Database: PostgreSQL
- ORM: Prisma
- Optional cache/rate-limit: Redis
- Auth: Session cookies + TOTP 2FA

## Runtime modes

- Public read + admin write (default)
- Fully private mode (`PUBLIC_READ_MODE=false`)

## Environment configuration

Key variables:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (Compose defaults; used to build `DATABASE_URL` in the app container)
- `DATABASE_URL` (optional in Docker Compose: built from `POSTGRES_*` in `docker-entrypoint.sh` unless set)
- `REDIS_URL` (optional)
- `PUBLIC_READ_MODE`
- `ENABLED_LANGUAGES`
- `HEKOTI_ADMIN_EMAIL`
- `HEKOTI_ADMIN_PASSWORD` — bootstrap admin when the `User` table is empty (defaults `admin` / `hehe` from `.env.example`; set your own in production). Change password after login: **Admin → Account**.
- `AI_AGENTS_JSON`
- `DONATE_LINKS_JSON`
- `CRYPTO_DONATION_JSON`
- `LANGUAGETOOL_URL` (optional; Docker Compose service `hekoti-languagetool`)

### Media (S3-compatible)

- `MEDIA_STORAGE=local` — dev: files under `public/uploads` (Compose volume `hekoti_uploads`)
- `MEDIA_STORAGE=s3` — prod: blobs in bucket; PostgreSQL stores metadata only (`MediaAsset`)
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
- `ASSETS_BASE_URL` — CDN prefix for local mode

MinIO example: set `S3_ENDPOINT=https://minio.example.com` and `S3_PUBLIC_URL=https://cdn.example.com`; path-style is enabled automatically when endpoint is set.

## AI agents

You can configure multiple providers at once using `AI_AGENTS_JSON`.

Built-in defaults include OpenAI, Gemini, Claude, Grok, DeepSeek, Qwen, and Copilot.

### Admin chat commands

- `/agent list`
- `/agent set <id>`
- `/agent on <id>`
- `/ask <prompt>`

Chat is stored in DB (`AgentChannel` / `AgentMessage`) and rendered in the admin panel.

## API summary

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/confirm`
- `GET|POST /api/agent/chat`
- `GET|POST /api/pages`
- `PATCH /api/pages/:id`
- `POST /api/media/upload`
- `POST /api/media/presign` — presigned PUT for video (`MEDIA_STORAGE=s3`)
- `POST /api/media/complete` — register video after direct S3 upload
- `GET /api/admin/media` — media gallery (metadata in DB, files in S3 or `LOCAL_UPLOAD_DIR`)
- `DELETE /api/admin/media/:id` — delete object and soft-delete record
- `POST /api/webhooks/incoming`
- `GET /api/health` — aggregate probe (`200` requires database)
- `GET /api/health/live`
- `GET /api/health/ready`
- `POST /api/spellcheck` — LanguageTool proxy (admin only; requires `LANGUAGETOOL_URL`)

## Multiple instances on one VM (2–4+)

One repo — several deploy roots (`/opt/app/ops/hh/chat`, `world`, `lore`, …). Avoid Docker conflicts with a **unique `.env` per root**, not by editing `docker-compose.yml`.

| Instance | `HEKOTI_INSTANCE` | `COMPOSE_PROJECT_NAME` | host port | internal network |
|----------|-------------------|------------------------|-----------|------------------|
| chat (legacy) | `hekoti` | `hh-hekoti` | 3310 | `hh-network` |
| world | `world` | `hh-world` | 3311 | `hh-world-net` |
| lore (3rd) | `lore` | `hh-lore` | 3312 | `hh-lore-net` |

### Checklist before `docker compose up`

1. Unique `HEKOTI_INSTANCE` and `COMPOSE_PROJECT_NAME`
2. Free `HEKOTI_HOST_PORT` (`ss -tlnp`)
3. Fresh `POSTGRES_*`; secrets optional — auto-generated on first boot (`HEKOTI_AUTO_SECRETS=1`, default)
4. Own `SESSION_COOKIE_NAME` and `APP_URL` (subdomain per instance)
5. Slug ≤ ~15 chars (`hh-{slug}-app` ≤ 24)
6. Record in ops / port-registry

### LanguageTool

| `HEKOTI_LT_MODE` | Compose | `LANGUAGETOOL_URL` |
|------------------|---------|-------------------|
| `embedded` | `COMPOSE_PROFILES=embedded-lt` | `http://hekoti-languagetool:8010` |
| `external` | `docker compose -f docker-compose.yml -f deploy/docker-compose.external-lt.yml` | `http://hh-shared-lt:8010` |
| `off` | no profile | empty |

Shared LT (recommended for 2+ wikis):

```bash
docker network create hh-shared-net
docker compose -f deploy/docker-compose.shared-lt.yml up -d
```

Templates: `.env.world.example`, `.agentrules.instance.example`.

### NPM

Upstream app container only: `http://hh-{instance}-app:3310` (container port). Postgres and Redis are **not** on `proxy-network`.

## Operations checklist

1. Copy `.env.example` to `.env` and change secrets.
2. Run migrations before first boot.
3. Enable HTTPS via reverse proxy.
4. Monitor 401/403 spikes and webhook failures.
5. Backup PostgreSQL regularly.
