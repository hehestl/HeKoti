import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const sub = process.env.HERON_SUB?.trim() || null;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL unset");

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const users = await prisma.user.findMany({
      where: sub ? { heronSubjectId: sub } : { heronSubjectId: { not: null } },
      select: { id: true, email: true, role: true, heronSubjectId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!users.length) {
      console.error("[promote-heron-admin] No Heron-linked users found");
      process.exit(1);
    }
    for (const u of users) {
      if (u.role === UserRole.ADMIN) {
        console.log(`[promote-heron-admin] already ADMIN ${u.email} ${u.heronSubjectId}`);
        continue;
      }
      await prisma.user.update({
        where: { id: u.id },
        data: { role: UserRole.ADMIN },
      });
      console.log(`[promote-heron-admin] promoted ADMIN ${u.email} ${u.heronSubjectId}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[promote-heron-admin]", err);
  process.exit(1);
});
