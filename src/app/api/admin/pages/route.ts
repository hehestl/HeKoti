import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { getEnabledLanguages } from "@/lib/site-config";
import { getGlobalSettings } from "@/lib/i18n";
import { notesPageWhere, wikiPageWhere } from "@/lib/page-query";

const PAGE_SELECT = {
  id: true,
  title: true,
  slug: true,
  path: true,
  contentMd: true,
  isPublished: true,
  showToc: true,
  navOrder: true,
  icon: true,
  isCategory: true,
  lang: true,
  scope: true,
  systemKey: true,
} as const;

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";
    const scopeParam = searchParams.get("scope") ?? "wiki";
    const scope = scopeParam === "notes" ? "NOTES" : "WIKI";
    const scopeWhere = scope === "NOTES" ? notesPageWhere : wikiPageWhere;
    const langParam = searchParams.get("lang");
    const enabled = await getEnabledLanguages();
    const settings = await getGlobalSettings();

    if (all) {
      const entries = await Promise.all(
        enabled.map(async (lang) => {
          const rows = await prisma.page.findMany({
            where: { lang, ...scopeWhere },
            orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
            take: 500,
            select: PAGE_SELECT,
          });
          return [lang, rows] as const;
        }),
      );
      return NextResponse.json(Object.fromEntries(entries));
    }

    const lang =
      scope === "NOTES"
        ? settings.adminLanguage
        : langParam && enabled.includes(langParam)
          ? langParam
          : (enabled[0] ?? "en");

    const rows = await prisma.page.findMany({
      where: { lang, ...scopeWhere },
      orderBy: [{ navOrder: "asc" }, { updatedAt: "desc" }],
      take: scope === "NOTES" ? 300 : 500,
      select: PAGE_SELECT,
    });
    return NextResponse.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
