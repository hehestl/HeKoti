import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { limitTotpLogin, requestIp } from "@/lib/auth-rate-limit";
import { prisma } from "@/lib/db";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/totp";

function readCode(body: unknown): { code: string } | { error: string } {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected JSON with code." };
  }
  const raw = body as Record<string, unknown>;
  const code =
    typeof raw.code === "string"
      ? raw.code
      : raw.code === null || raw.code === undefined
        ? ""
        : String(raw.code);
  if (!code.trim()) {
    return { error: "code is required." };
  }
  return { code };
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  // Rate limit TOTP verification attempts
  const ip = requestIp(request);
  const limit = await limitTotpLogin(ip);
  if (limit.blocked) {
    return NextResponse.json(
      { ok: false, message: "Too many TOTP attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const parsed = readCode(json);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const full = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!full?.totpSecret) {
    return NextResponse.json({ ok: false, message: "Run setup first." }, { status: 400 });
  }

  if (full.isTotpEnabled) {
    return NextResponse.json({ ok: true, message: "2FA is already enabled." });
  }

  let plain: string;
  try {
    plain = decryptTotpSecret(full.totpSecret);
  } catch {
    return NextResponse.json({ ok: false, message: "Stored secret is invalid. Run setup again." }, { status: 500 });
  }

  if (!verifyTotpToken(plain, parsed.code)) {
    return NextResponse.json({ ok: false, message: "Invalid code." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { isTotpEnabled: true },
  });

  return NextResponse.json({ ok: true, message: "Two-factor authentication is on." });
}
