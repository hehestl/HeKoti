import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { signPendingLogin, verifyPendingLogin } from "@/lib/pending-login";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/totp";

/**
 * Email validation regex
 * Based on RFC 5322 with some modern relaxations
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (email !== email.trim()) return false;
  if (!EMAIL_REGEX.test(email)) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || local.length > 64) return false;
  if (local.includes("..") || domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (!/^[a-zA-Z]{2,63}$/.test(labels[labels.length - 1] ?? "")) return false;
  return labels.every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label));
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * `Secure` on session cookie. Behind TLS reverse proxy, trust `X-Forwarded-Proto`
 * (NPM, Traefik, Caddy usually send it) even if `APP_URL` in the container is still http://app:3310.
 */
async function sessionCookieSecure(): Promise<boolean> {
  if (env.SESSION_COOKIE_INSECURE === "1") return false;
  if (env.NODE_ENV !== "production") return false;

  const h = await headers();
  const forwarded = h.get("x-forwarded-proto");
  if (forwarded) {
    const proto = forwarded.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (proto === "http") return false;
  }

  try {
    return new URL(env.APP_URL).protocol === "https:";
  } catch {
    return false;
  }
}

// Maximum session lifetime (30 days) - absolute timeout
const MAX_SESSION_LIFETIME_HOURS = 720;

export async function createAdminSession(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  
  // Calculate expiration with maximum lifetime cap
  const ttlMs = Math.min(
    env.SESSION_TTL_HOURS * 3600 * 1000,
    MAX_SESSION_LIFETIME_HOURS * 3600 * 1000
  );
  const expiresAt = new Date(Date.now() + ttlMs);
  
  await prisma.session.create({ data: { tokenHash, userId, expiresAt } });
  const store = await cookies();
  const secure = await sessionCookieSecure();
  store.set(env.SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Password step: creates session immediately if TOTP is off; otherwise returns a short-lived pending token.
 */
export async function loginAdminPasswordStep(input: { email: string; password: string }) {
  const email = input.email.trim();
  
  // Validate email format
  if (!isValidEmail(email)) {
    throw new Error("Invalid credentials.");
  }
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials.");
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials.");

  if (!user.isTotpEnabled) {
    await createAdminSession(user.id);
    return { needsTotp: false as const };
  }

  if (!user.totpSecret) {
    await createAdminSession(user.id);
    return { needsTotp: false as const };
  }

  const pendingToken = signPendingLogin(user.id);
  return { needsTotp: true as const, pendingToken };
}

export async function loginAdminTotpStep(input: { pendingToken: string; code: string }) {
  let userId: string;
  try {
    userId = verifyPendingLogin(input.pendingToken).userId;
  } catch {
    throw new Error("Invalid or expired login. Start over.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isTotpEnabled || !user.totpSecret) {
    throw new Error("Invalid credentials.");
  }

  let plain: string;
  try {
    plain = decryptTotpSecret(user.totpSecret);
  } catch {
    throw new Error("Invalid credentials.");
  }

  if (!verifyTotpToken(plain, input.code)) {
    throw new Error("Invalid code.");
  }

  await createAdminSession(user.id);
}

export async function logoutAdmin() {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(env.SESSION_COOKIE_NAME);
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  
  if (!session || session.expiresAt <= new Date()) {
    // Clean up expired session
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }
  
  // Check if session is approaching expiration (refresh if needed)
  const now = Date.now();
  const expiresAt = session.expiresAt.getTime();
  const timeLeft = expiresAt - now;
  const ttlMs = env.SESSION_TTL_HOURS * 3600 * 1000;
  
  // If more than half the TTL has passed, extend the session
  if (timeLeft < ttlMs / 2) {
    const newExpiresAt = new Date(Date.now() + ttlMs);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
    
    // Update cookie expiration
    const secure = await sessionCookieSecure();
    store.set(env.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      expires: newExpiresAt,
      path: "/",
    });
  }
  
  return session.user;
}

export async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized.");
  return user;
}
