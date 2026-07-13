import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL unset in container");

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, heronSubjectId: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[list-wiki-users]", err);
  process.exit(1);
});
