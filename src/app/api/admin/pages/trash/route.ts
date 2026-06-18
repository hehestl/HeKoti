import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { listTrashPages } from "@/lib/page-trash";

export async function GET() {
  try {
    await requireAdminUser();
    const rows = await listTrashPages();
    return NextResponse.json({ ok: true, pages: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
