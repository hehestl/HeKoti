import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { prisma } from "@/lib/db";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/totp";

function readDisableBody(body: unknown): { currentPassword: string; code: string } | { error: string } {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected JSON with currentPassword and code." };
  }
  const raw = body as Record<string, unknown>;
  const currentPassword =
    typeof raw.currentPassword === "string"
      ? raw.currentPassword
      : raw.currentPassword === null || raw.currentPassword === undefined
        ? ""
        : String(raw.currentPassword);
  const code =
    typeof raw.code === "string"
      ? raw.code
      : raw.code === null || raw.code === undefined
        ? ""
        : String(raw.code);
  if (!currentPassword) {
    return { error: "currentPassword is required." };
  }
  if (!code.trim()) {
    return { error: "code is required." };
  }
  return { currentPassword, code };
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const parsed = readDisableBody(json);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const full = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!full) {
    return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  }

  if (!full.isTotpEnabled || !full.totpSecret) {
    return NextResponse.json({ ok: false, message: "2FA is not enabled." }, { status: 400 });
  }

  if (!full.passwordHash) {
    return NextResponse.json({ ok: false, message: "Password login is not available for this account." }, { status: 400 });
  }

  const validPw = await bcrypt.compare(parsed.currentPassword, full.passwordHash);
  if (!validPw) {
    return NextResponse.json({ ok: false, message: "Wrong current password." }, { status: 401 });
  }

  let plain: string;
  try {
    plain = decryptTotpSecret(full.totpSecret);
  } catch {
    return NextResponse.json({ ok: false, message: "Stored secret is invalid." }, { status: 500 });
  }

  if (!verifyTotpToken(plain, parsed.code)) {
    return NextResponse.json({ ok: false, message: "Invalid code." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { totpSecret: null, isTotpEnabled: false },
  });

  await prisma.session.deleteMany({ where: { userId: sessionUser.id } });

  return NextResponse.json({
    ok: true,
    relogin: true,
    message: "2FA disabled. Sign in again.",
  });
}
