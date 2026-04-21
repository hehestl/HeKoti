import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, status: "ready" });
  } catch {
    return NextResponse.json({ ok: false, status: "db-unreachable" }, { status: 503 });
  }
}
