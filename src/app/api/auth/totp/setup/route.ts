import { NextResponse } from "next/server";
import { authenticator } from "@otplib/preset-default";
import QRCode from "qrcode";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const user = await requireAdminUser();
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "Hekoti", secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, isTotpEnabled: false },
    });
    return NextResponse.json({ ok: true, otpauth, qrDataUrl, needsConfirmation: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "TOTP setup failed" },
      { status: 400 },
    );
  }
}
