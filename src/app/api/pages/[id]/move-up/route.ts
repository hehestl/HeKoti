import { NextResponse } from "next/server";
import { invalidateSearchLangCache, invalidateWikiLangCache } from "@/lib/cache";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSiblingGroupPaths } from "@/lib/wiki-path";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;

    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    const { lang } = page;
    const all = await prisma.page.findMany({
      where: { lang },
      select: { id: true, path: true, navOrder: true, title: true },
    });

    const siblingPathSet = new Set(getSiblingGroupPaths(all, page.path, lang));
    const siblings = all.filter((p) => siblingPathSet.has(p.path));
    const sorted = [...siblings].sort((a, b) => a.navOrder - b.navOrder || a.title.localeCompare(b.title));
    const idx = sorted.findIndex((p) => p.id === id);
    if (idx <= 0) {
      return NextResponse.json({ ok: false, message: "Уже первая в списке." }, { status: 400 });
    }

    const reordered = [...sorted];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];

    await prisma.$transaction(
      reordered.map((row, i) => prisma.page.update({ where: { id: row.id }, data: { navOrder: i * 10 } })),
    );

    await invalidateWikiLangCache(lang);
    await invalidateSearchLangCache(lang);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Move failed";
    const status = msg === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
