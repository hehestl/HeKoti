import Redis from "ioredis";
import { LRUCache } from "lru-cache";
import { env } from "@/lib/env";

const memoryCache = new LRUCache<string, string>({
  max: 500,
  ttl: env.REDIS_CACHE_TTL_SECONDS * 1000,
});

let redisClient: Redis | null = null;

export function getRedis() {
  if (!env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });
  }
  return redisClient;
}

export async function getCached(key: string) {
  const redis = getRedis();
  if (redis) return redis.get(key);
  return memoryCache.get(key) ?? null;
}

export async function setCached(key: string, value: string, ttlSec = env.REDIS_CACHE_TTL_SECONDS) {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value, "EX", ttlSec);
    return;
  }
  memoryCache.set(key, value, { ttl: ttlSec * 1000 });
}

export async function delCached(key: string) {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryCache.delete(key);
}

/** Drop all cached wiki HTML for a language (e.g. after /post targets or titles change). */
export async function invalidateWikiLangCache(lang: string) {
  await delCached(`wiki-links:${lang}`);
  const prefixes = [`wiki:${lang}:`, `wiki-catalog:${lang}:`];
  const redis = getRedis();
  if (redis) {
    for (const prefix of prefixes) {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
        cursor = next;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    }
    return;
  }
  for (const key of memoryCache.keys()) {
    if (typeof key === "string" && prefixes.some((prefix) => key.startsWith(prefix))) {
      memoryCache.delete(key);
    }
  }
}

export async function invalidateSearchLangCache(lang: string) {
  const prefix = `search:${lang}:`;
  const redis = getRedis();
  if (redis) {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
    return;
  }
  for (const key of memoryCache.keys()) {
    if (typeof key === "string" && key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export async function bumpRateLimitKey(key: string, windowSec: number) {
  const redis = getRedis();
  if (redis) {
    const tx = redis.multi();
    tx.incr(key);
    tx.expire(key, windowSec);
    const data = await tx.exec();
    return Number(data?.[0]?.[1] ?? 1);
  }
  const current = Number(memoryCache.get(key) ?? "0") + 1;
  memoryCache.set(key, String(current), { ttl: windowSec * 1000 });
  return current;
}
