import { defineConfig } from "prisma/config";

/** Same default as `src/lib/env.ts` so `prisma generate` works without a local `.env`. */
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://hekoti:hekoti@localhost:5432/hekoti?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
