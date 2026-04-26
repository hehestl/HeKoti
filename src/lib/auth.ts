import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Secure cookies only for HTTPS (or when explicitly forced). HTTP / reverse-proxy HTTP→app: allow session. */
function sessionCookieSecure(): boolean {
  if (env.SESSION_COOKIE_INSECURE === "1") return false;
  if (env.NODE_ENV !== "production") return false;
  try {
    return new URL(env.APP_URL).protocol === "https:";
  } catch {
    return false;
  }
}

export async function loginAdmin(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.trim() } });
  if (!user) throw new Error("Invalid credentials.");
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials.");

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);
  await prisma.session.create({ data: { tokenHash, userId: user.id, expiresAt } });
  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
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
