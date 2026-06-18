import { NextResponse } from "next/server";
import { z } from "zod";
import { getCached, invalidateSearchLangCache, invalidateWikiLangCache, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { normalizePath, toSlug } from "@/lib/slug";
import { getSiblingGroupPaths } from "@/lib/wiki-path";
import { isWikiIconKey } from "@/lib/wiki-icon-presets";
import { buildSearchWhere, parseSearchTerms } from "@/lib/wiki-search";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { activePageWhere } from "@/lib/page-query";

const createSchema = z.object({
  lang: z.string().min(2).max(8),
  title: z.string().min(1),
  contentMd: z.string().default(""),
  parentPathParts: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  isCategory: z.boolean().default(false),
  icon: z.string().min(1).max(32).optional().nullable(),
  slug: z.string().min(1).optional(),
});

const cloneSchema = z.object({
  sourcePath: z.string().min(4),
  targetLang: z.string().min(2).max(8),
  isPublished: z.boolean().optional(),
  redirectTo: z.string().optional(),
});

function isFormRequest(request: Request) {
  const ct = request.headers.get("content-type") ?? "";
  return ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "en";
  const query = (searchParams.get("q") ?? "").trim();
  const cacheKey = `search:${lang}:${query}`;
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  const terms = parseSearchTerms(query);
  const rows = await prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...activePageWhere,
      ...buildSearchWhere(terms),
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  const result = rows.map((item) => ({ id: item.id, title: item.title, path: item.path }));
  await setCached(cacheKey, JSON.stringify(result), 120);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const raw = isFormRequest(request) ? Object.fromEntries((await request.formData()).entries()) : await request.json();

    if (raw && typeof raw === "object" && "sourcePath" in raw && "targetLang" in raw) {
      const payload = cloneSchema.parse(raw);
      const sourcePath = String(payload.sourcePath);
      const targetLang = String(payload.targetLang);
      const source = await prisma.page.findFirst({ where: { path: sourcePath, ...activePageWhere } });
      if (!source) {
        return NextResponse.json({ ok: false, message: "Source page not found." }, { status: 404 });
      }

      const tail = sourcePath.replace(/^\/[^/]+/, "");
      const targetPath = `/${targetLang}${tail}`;
      const existing = await prisma.page.findFirst({ where: { lang: targetLang, path: targetPath, ...activePageWhere } });
      if (existing) {
        const redirectTo = payload.redirectTo || `/${targetLang}/admin?tab=posts&activePath=${encodeURIComponent(existing.path)}`;
        if (isFormRequest(request)) {
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
        return NextResponse.json({ ok: false, code: "exists", existingPath: existing.path }, { status: 409 });
      }

      const segs = tail.split("/").filter(Boolean);

      const originalId = source.originalId ?? source.id;
      const page = await prisma.$transaction(async (tx) => {
        const existingSameLang = await tx.page.findMany({
          where: { lang: targetLang, ...activePageWhere },
          select: { path: true, navOrder: true },
        });
        const siblingPaths = new Set(getSiblingGroupPaths(existingSameLang, targetPath, targetLang));
        const maxNav = existingSameLang.filter((p) => siblingPaths.has(p.path)).reduce((m, p) => Math.max(m, p.navOrder), 0);
        const created = await tx.page.create({
          data: {
            title: source.title,
            slug: source.slug,
            lang: targetLang,
            contentMd: source.contentMd,
            excerpt: source.excerpt,
            isPublished: payload.isPublished ?? false,
            path: normalizePath(targetLang, segs),
            navOrder: maxNav + 10,
            originalId,
          },
        });
        await tx.pageRevision.create({
          data: {
            pageId: created.id,
            editorId: user.id,
            title: created.title,
            contentMd: created.contentMd,
          },
        });
        return created;
      });

      await invalidateWikiLangCache(targetLang);
      await invalidateSearchLangCache(targetLang);
      await emitOutgoingWebhook("page.created", { pageId: page.id, path: page.path, published: page.isPublished });

      const redirectTo = payload.redirectTo || `/${targetLang}/admin?tab=posts&activePath=${encodeURIComponent(page.path)}`;
      if (isFormRequest(request)) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      return NextResponse.json(page);
    }

    const payload = createSchema.parse(raw);
    if (payload.icon != null && payload.icon !== "" && !isWikiIconKey(payload.icon)) {
      return NextResponse.json({ ok: false, message: "Invalid icon key." }, { status: 400 });
    }
    const slug = payload.slug ? String(payload.slug) : toSlug(payload.title);
    const path = normalizePath(payload.lang, [...payload.parentPathParts, slug]);

    const page = await prisma.$transaction(async (tx) => {
      const existingSameLang = await tx.page.findMany({
        where: { lang: payload.lang, ...activePageWhere },
        select: { path: true, navOrder: true },
      });
      const siblingPaths = new Set(getSiblingGroupPaths(existingSameLang, path, payload.lang));
      const maxNav = existingSameLang.filter((p) => siblingPaths.has(p.path)).reduce((m, p) => Math.max(m, p.navOrder), 0);
      const created = await tx.page.create({
        data: {
          title: payload.title,
          slug,
          lang: payload.lang,
          contentMd: payload.contentMd,
          isPublished: payload.isPublished,
          isCategory: payload.isCategory,
          icon: payload.icon ?? null,
          path,
          navOrder: maxNav + 10,
        },
      });
      await tx.pageRevision.create({
        data: {
          pageId: created.id,
          editorId: user.id,
          title: payload.title,
          contentMd: payload.contentMd,
        },
      });
      return created;
    });
    await invalidateWikiLangCache(payload.lang);
    await invalidateSearchLangCache(payload.lang);
    await emitOutgoingWebhook("page.created", { pageId: page.id, path: page.path, published: page.isPublished });
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Create failed" },
      { status: 400 },
    );
  }
}
