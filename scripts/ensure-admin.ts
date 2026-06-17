/**
 * Вызывается из docker-entrypoint после migrate.
 * - Пустая таблица User → создаётся админ из HEKOTI_ADMIN_EMAIL / HEKOTI_ADMIN_PASSWORD (дефолты admin / hehe).
 * - HEKOTI_FORCE_ADMIN_RESET=1 → upsert пользователя с этим email и перезапись пароля (аварийный сброс).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const email = (process.env.HEKOTI_ADMIN_EMAIL ?? "admin").trim();
  const password = process.env.HEKOTI_ADMIN_PASSWORD ?? "hehe";
  const force = process.env.HEKOTI_FORCE_ADMIN_RESET === "1";
  const isProd = (process.env.NODE_ENV ?? "development") === "production";

  if (isProd && (email === "admin" || password === "hehe")) {
    throw new Error(
      "Refusing default admin credentials in production. Set HEKOTI_ADMIN_EMAIL and HEKOTI_ADMIN_PASSWORD.",
    );
  }

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    if (force) {
      const hash = await bcrypt.hash(password, 12);
      await prisma.user.upsert({
        where: { email },
        update: { passwordHash: hash, role: UserRole.ADMIN },
        create: { email, passwordHash: hash, role: UserRole.ADMIN },
      });
      console.log(`[ensure-admin] HEKOTI_FORCE_ADMIN_RESET: password updated for login="${email}"`);
      return;
    }

    const n = await prisma.user.count();
    if (n > 0) {
      console.log(`[ensure-admin] ${n} user(s) exist, skip bootstrap (set HEKOTI_FORCE_ADMIN_RESET=1 to reset "${email}")`);
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash: hash, role: UserRole.ADMIN },
    });
    console.log(`[ensure-admin] created admin login="${email}"`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[ensure-admin]", err);
  process.exit(1);
});
