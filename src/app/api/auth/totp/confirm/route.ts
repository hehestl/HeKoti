import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticator } from "@otplib/preset-default";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  code: z.string().trim().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const payload = bodySchema.parse(await request.json());
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, totpSecret: true, isTotpEnabled: true },
    });
    if (!fullUser?.totpSecret) {
      return NextResponse.json({ ok: false, message: "Run setup first." }, { status: 400 });
    }
    if (!authenticator.check(payload.code, fullUser.totpSecret)) {
      return NextResponse.json({ ok: false, message: "Invalid TOTP code." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: fullUser.id },
      data: { isTotpEnabled: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Confirmation failed" },
      { status: 400 },
    );
  }
}
