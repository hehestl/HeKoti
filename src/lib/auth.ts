import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { signPendingLogin, verifyPendingLogin } from "@/lib/pending-login";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/totp";

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

export async function createAdminSession(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);
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
  const user = await prisma.user.findUnique({ where: { email: input.email.trim() } });
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
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized.");
  return user;
}
