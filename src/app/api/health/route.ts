import { NextResponse } from "next/server";
import { getRedis } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Combined readiness probe for reverse proxies (Nginx/Traefik/Caddy).
 * Returns 200 only when the database is reachable.
 */
export async function GET() {
  let dbOk = false;
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : "db error";
  }

  const redis = getRedis();
  let redisOk: boolean | "skipped" = "skipped";
  if (redis) {
    try {
      await redis.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
  }

  let languagetoolOk: boolean | "skipped" | "disabled" = "disabled";
  if (env.LANGUAGETOOL_URL?.trim()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(`${env.LANGUAGETOOL_URL.replace(/\/$/, "")}/v2/languages`, {
        signal: controller.signal,
      });
      languagetoolOk = res.ok;
    } catch {
      languagetoolOk = false;
    } finally {
      clearTimeout(timeout);
    }
  } else {
    languagetoolOk = "skipped";
  }

  const ok = dbOk;
  const status = ok ? 200 : 503;
  return NextResponse.json(
    {
      ok,
      service: "hekoti",
      checks: {
        database: dbOk ? "up" : "down",
        redis: redisOk,
        languagetool: languagetoolOk,
      },
      ...(dbError ? { dbError } : {}),
    },
    { status },
  );
}
