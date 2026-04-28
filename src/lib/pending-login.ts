import crypto from "crypto";
import { env } from "@/lib/env";

const PREFIX = "hekoti:pending-login:";

export function signPendingLogin(userId: string, ttlMs = 5 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp }), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", env.WEBHOOK_SECRET)
    .update(PREFIX + payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPendingLogin(token: string): { userId: string } {
  const i = token.lastIndexOf(".");
  if (i <= 0) {
    throw new Error("Invalid token.");
  }
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto
    .createHmac("sha256", env.WEBHOOK_SECRET)
    .update(PREFIX + payload)
    .digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid token.");
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub: string; exp: number };
  if (typeof data.exp !== "number" || typeof data.sub !== "string" || data.exp < Date.now()) {
    throw new Error("Expired.");
  }
  return { userId: data.sub };
}
