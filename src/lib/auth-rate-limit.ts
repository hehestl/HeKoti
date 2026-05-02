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
