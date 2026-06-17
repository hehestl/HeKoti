import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { prisma } from "@/lib/db";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const u = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { isTotpEnabled: true, totpSecret: true },
  });

  const status =
    u?.isTotpEnabled ? "enabled" : u?.totpSecret ? "pending" : ("off" as const);

  return NextResponse.json({ ok: true, status });
}
