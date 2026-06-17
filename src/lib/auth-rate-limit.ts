import { bumpRateLimitKey } from "@/lib/cache";

function normalizeIp(raw?: string | null) {
  if (!raw) return "unknown";
  const first = raw.split(",")[0]?.trim();
  return first || "unknown";
}

export function requestIp(request: Request) {
  return normalizeIp(request.headers.get("x-forwarded-for"));
}

export async function limitPasswordLogin(ip: string, email: string) {
  const windowSec = 5 * 60;
  const byIp = await bumpRateLimitKey(`rl:auth:login:ip:${ip}`, windowSec);
  const byEmail = await bumpRateLimitKey(`rl:auth:login:email:${email.toLowerCase()}`, windowSec);
  const retryAfterSec = windowSec;
  const blocked = byIp > 20 || byEmail > 10;
  return { blocked, retryAfterSec };
}

export async function limitTotpLogin(ip: string) {
  const windowSec = 5 * 60;
  const byIp = await bumpRateLimitKey(`rl:auth:totp:ip:${ip}`, windowSec);
  const retryAfterSec = windowSec;
  const blocked = byIp > 25;
  return { blocked, retryAfterSec };
}

export async function limitHeronExchange(ip: string, subject: string, maxPerWindow: number) {
  const windowSec = 60;
  const byIp = await bumpRateLimitKey(`rl:auth:heron:ip:${ip}`, windowSec);
  const bySub = await bumpRateLimitKey(`rl:auth:heron:sub:${subject.toLowerCase()}`, windowSec);
  const retryAfterSec = windowSec;
  const blocked = byIp > maxPerWindow || bySub > maxPerWindow;
  return { blocked, retryAfterSec };
}

type AiLocalizeKind = "single" | "all" | "branch";

const AI_LOCALIZE_LIMITS: Record<AiLocalizeKind, { windowSec: number; maxIp: number; maxUser: number }> = {
  single: { windowSec: 3600, maxIp: 20, maxUser: 60 },
  all: { windowSec: 3600, maxIp: 8, maxUser: 20 },
  branch: { windowSec: 3600, maxIp: 3, maxUser: 10 },
};

export async function limitAiLocalize(ip: string, userId: string, kind: AiLocalizeKind) {
  const { windowSec, maxIp, maxUser } = AI_LOCALIZE_LIMITS[kind];
  const byIp = await bumpRateLimitKey(`rl:ai:localize:${kind}:ip:${ip}`, windowSec);
  const byUser = await bumpRateLimitKey(`rl:ai:localize:${kind}:user:${userId}`, windowSec);
  const retryAfterSec = windowSec;
  const blocked = byIp > maxIp || byUser > maxUser;
  return { blocked, retryAfterSec };
}
