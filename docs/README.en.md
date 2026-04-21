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

- `DATABASE_URL`
- `REDIS_URL` (optional)
- `PUBLIC_READ_MODE`
- `ENABLED_LANGUAGES`
- `HEKOTI_ADMIN_EMAIL`
- `HEKOTI_ADMIN_PASSWORD`
- `AI_AGENTS_JSON`
- `DONATE_LINKS_JSON`
- `CRYPTO_DONATION_JSON`

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
- `POST /api/webhooks/incoming`
- `GET /api/health/live`
- `GET /api/health/ready`

## Operations checklist

1. Copy `.env.example` to `.env` and change secrets.
2. Run migrations before first boot.
3. Enable HTTPS via reverse proxy.
4. Monitor 401/403 spikes and webhook failures.
5. Backup PostgreSQL regularly.
