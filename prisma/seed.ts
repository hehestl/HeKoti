import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

/** Local dev: load `.env` when `dotenv` is installed. Docker/Compose injects env — no `dotenv` in the runtime image. */
async function loadDotenvOptional() {
  await import("dotenv/config").catch(() => {});
}

async function main() {
  await loadDotenvOptional();
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new pg.Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const adminEmail = process.env.HEKOTI_ADMIN_EMAIL ?? "admin@hekoti.local";
    const adminPassword = process.env.HEKOTI_ADMIN_PASSWORD ?? "change-me-now";
    const hash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash: hash, role: "admin" },
      create: { email: adminEmail, passwordHash: hash, role: "admin" },
    });

    await prisma.page.upsert({
      where: { path: "/en/welcome" },
      update: {},
      create: {
        title: "Welcome to Hekoti",
        slug: "welcome",
        lang: "en",
        path: "/en/welcome",
        isPublished: true,
        contentMd:
          "# Hekoti\n\nAsk Hekoti and knowledge will awaken.\n\nThis is your first public page.",
      },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
