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

## Operations checklist

1. Copy `.env.example` to `.env` and change secrets.
2. Run migrations before first boot.
3. Enable HTTPS via reverse proxy.
4. Monitor 401/403 spikes and webhook failures.
5. Backup PostgreSQL regularly.
