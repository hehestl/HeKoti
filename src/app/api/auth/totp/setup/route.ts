import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { prisma } from "@/lib/db";
import { encryptTotpSecret, generateTotpSecret, qrDataUrlForTotp, TOTP_ISSUER } from "@/lib/totp";

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const plain = generateTotpSecret();
  const encrypted = encryptTotpSecret(plain);

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { totpSecret: encrypted, isTotpEnabled: false },
  });

  const qrDataUrl = await qrDataUrlForTotp({
    secret: plain,
    accountLabel: sessionUser.email,
    issuer: TOTP_ISSUER,
  });

  return NextResponse.json({
    ok: true,
    qrDataUrl,
    /** Base32 secret for manual entry in authenticator apps. */
    manualSecret: plain,
  });
}
