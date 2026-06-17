import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listPageCounterparts } from "@/lib/page-counterparts";
import { getEnabledLanguages } from "@/lib/site-config";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const page = await prisma.page.findUnique({
      where: { id },
      select: { id: true, originalId: true, path: true, lang: true, title: true },
    });
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const langs = await getEnabledLanguages();
    const counterparts = await listPageCounterparts(page, langs);
    return NextResponse.json({
      ok: true,
      source: { id: page.id, lang: page.lang, path: page.path, title: page.title },
      counterparts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Counterparts lookup failed";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}