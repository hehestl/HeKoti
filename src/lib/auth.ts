import crypto from "crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "@otplib/preset-default";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { bumpRateLimitKey } from "@/lib/cache";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function loginAdmin(input: {
  email: string;
  password: string;
  totpCode?: string;
  ipKey: string;
}) {
  const attempts = await bumpRateLimitKey(
    `rate:login:${input.ipKey}`,
    env.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
  );
  if (attempts > env.RATE_LIMIT_LOGIN_ATTEMPTS) {
    throw new Error("Too many login attempts. Try later.");
  }

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new Error("Invalid credentials.");
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials.");
  if (user.isTotpEnabled) {
    if (!input.totpCode || !user.totpSecret) {
      throw new Error("TOTP code required.");
    }
    if (!authenticator.check(input.totpCode, user.totpSecret)) {
      throw new Error("Invalid TOTP code.");
    }
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);
  await prisma.session.create({ data: { tokenHash, userId: user.id, expiresAt } });
  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return { ok: true as const };
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
