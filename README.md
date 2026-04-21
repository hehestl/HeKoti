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
docker compose up -d --build
```

App URL: `http://localhost:3310`

## Quick start (local)

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

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
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
