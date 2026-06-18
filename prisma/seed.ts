import { UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

/** Local dev: load `.env` when `dotenv` is installed. Docker/Compose injects env — no `dotenv` in the runtime image. */
async function loadDotenvOptional() {
  await import("dotenv/config").catch(() => {});
}

async function ensurePageRevision(
  prisma: PrismaClient,
  pageId: string,
  editorId: string,
  title: string,
  contentMd: string,
) {
  const n = await prisma.pageRevision.count({ where: { pageId } });
  if (n > 0) return;
  await prisma.pageRevision.create({
    data: { pageId, editorId, title, contentMd },
  });
}

async function main() {
  await loadDotenvOptional();
  const connectionString =
    process.env.DATABASE_URL?.trim() ||
    `postgresql://${process.env.POSTGRES_USER ?? "hekoti_user"}:${process.env.POSTGRES_PASSWORD ?? "hekoti_password"}@hekoti-postgres:5432/${process.env.POSTGRES_DB ?? "hekoti_db"}?schema=public`;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new pg.Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const adminEmail = process.env.HEKOTI_ADMIN_EMAIL ?? "admin";
    const adminPassword = process.env.HEKOTI_ADMIN_PASSWORD ?? "hehe";
    const hash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash: hash, role: UserRole.ADMIN },
      create: { email: adminEmail, passwordHash: hash, role: UserRole.ADMIN },
    });

    const samples: {
      path: string;
      title: string;
      slug: string;
      lang: string;
      contentMd: string;
      excerpt?: string;
    }[] = [
      {
        path: "/en/welcome",
        title: "Welcome to Hekoti",
        slug: "welcome",
        lang: "en",
        excerpt: "Your self-hosted wiki is ready.",
        contentMd: `# Welcome

This is a **sample page**. Edit it in **Admin** after login.

- Create more pages from the \`+\` control in the top bar
- Search published pages from the wiki home
- Switch language with the globe control

Ask Hekoti and knowledge will awaken.`,
      },
      {
        path: "/ru/welcome",
        title: "Добро пожаловать в Hekoti",
        slug: "welcome",
        lang: "ru",
        excerpt: "Пример страницы на русском.",
        contentMd: `# Добро пожаловать

Это **демонстрационная страница**. После входа откройте **Админку**, чтобы править текст.

- Новые страницы — через кнопку \`+\` в шапке
- Опубликованные страницы ищутся с главной вики
- Язык переключается через иконку глобуса`,
      },
      {
        path: "/en/about",
        title: "About this wiki",
        slug: "about",
        lang: "en",
        contentMd: `# About

**Hekoti** is a small self-hosted knowledge wiki. This paragraph is seed data you can replace or delete in the admin editor.

## Structure

Pages live under a language prefix, for example \`/en/about\`. Revisions are stored when you save from the API or admin UI.`,
      },
      {
        path: "/en/quick-start",
        title: "Quick start",
        slug: "quick-start",
        lang: "en",
        contentMd: `# Quick start

1. Log in with the admin account from your \`.env\` (\`HEKOTI_ADMIN_EMAIL\` / \`HEKOTI_ADMIN_PASSWORD\`).
2. Open **Admin** and pick a page from the list.
3. Edit markdown, toggle **Published**, and save.

> Tip: run \`npm run db:seed\` (or \`tsx prisma/seed.ts\`) anytime to restore these demo pages without touching your admin password.`,
      },
    ];

    for (const row of samples) {
      const existing = await prisma.page.findFirst({
        where: { lang: row.lang, path: row.path, deletedAt: null },
      });
      const page = existing
        ? await prisma.page.update({
            where: { id: existing.id },
            data: {
              title: row.title,
              slug: row.slug,
              lang: row.lang,
              contentMd: row.contentMd,
              excerpt: row.excerpt ?? null,
              isPublished: true,
            },
          })
        : await prisma.page.create({
            data: {
              title: row.title,
              slug: row.slug,
              lang: row.lang,
              path: row.path,
              contentMd: row.contentMd,
              excerpt: row.excerpt ?? null,
              isPublished: true,
            },
          });
      await ensurePageRevision(prisma, page.id, admin.id, row.title, row.contentMd);
    }

    const channel = await prisma.agentChannel.upsert({
      where: { key: "demo" },
      update: { title: "Demo channel" },
      create: { key: "demo", title: "Demo channel" },
    });

    const msgCount = await prisma.agentMessage.count({ where: { channelId: channel.id } });
    if (msgCount === 0) {
      await prisma.agentMessage.createMany({
        data: [
          {
            channelId: channel.id,
            authorId: null,
            role: "assistant",
            content:
              "Hello — this is sample agent data. Replace it with real integrations in your deployment.",
          },
          {
            channelId: channel.id,
            authorId: admin.id,
            role: "user",
            content: "Example user message (seed).",
          },
        ],
      });
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
