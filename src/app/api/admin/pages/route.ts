import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { getEnabledLanguages } from "@/lib/site-config";
import { activePageWhere } from "@/lib/page-query";

const PAGE_SELECT = {
  id: true,
  title: true,
  path: true,
  contentMd: true,
  isPublished: true,
  navOrder: true,
  icon: true,
  isCategory: true,
  lang: true,
} as const;

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";
    const langParam = searchParams.get("lang");
    const enabled = await getEnabledLanguages();

    if (all) {
      const entries = await Promise.all(
        enabled.map(async (lang) => {
          const rows = await prisma.page.findMany({
            where: { lang, ...activePageWhere },
            orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
            take: 500,
            select: PAGE_SELECT,
          });
          return [lang, rows] as const;
        }),
      );
      return NextResponse.json(Object.fromEntries(entries));
    }

    const lang = langParam && enabled.includes(langParam) ? langParam : enabled[0] ?? "en";
    const rows = await prisma.page.findMany({
      where: { lang, ...activePageWhere },
      orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
      take: 500,
      select: PAGE_SELECT,
    });
    return NextResponse.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
