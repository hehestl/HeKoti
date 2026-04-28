import { NextResponse } from "next/server";
import { z } from "zod";
import { getCached, invalidateWikiLangCache, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { normalizePath, toSlug } from "@/lib/slug";
import { getSiblingGroupPaths } from "@/lib/wiki-path";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";

const createSchema = z.object({
  lang: z.string().min(2).max(8),
  title: z.string().min(1),
  contentMd: z.string().default(""),
  parentPathParts: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "en";
  const query = searchParams.get("q");
  const cacheKey = `search:${lang}:${query ?? ""}`;
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  const rows = await prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...(query
        ? {
            OR: [{ title: { contains: query, mode: "insensitive" } }, { contentMd: { contains: query, mode: "insensitive" } }],
          }
        : {}),
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
    const payload = createSchema.parse(await request.json());
    const slug = toSlug(payload.title);
    const path = normalizePath(payload.lang, [...payload.parentPathParts, slug]);

    const existingSameLang = await prisma.page.findMany({
      where: { lang: payload.lang },
      select: { path: true, navOrder: true },
    });
    const siblingPaths = new Set(getSiblingGroupPaths(existingSameLang, path, payload.lang));
    const maxNav = existingSameLang.filter((p) => siblingPaths.has(p.path)).reduce((m, p) => Math.max(m, p.navOrder), 0);

    const page = await prisma.page.create({
      data: {
        title: payload.title,
        slug,
        lang: payload.lang,
        contentMd: payload.contentMd,
        isPublished: payload.isPublished,
        path,
        navOrder: maxNav + 10,
      },
    });
    await prisma.pageRevision.create({
      data: {
        pageId: page.id,
        editorId: user.id,
        title: payload.title,
        contentMd: payload.contentMd,
      },
    });
    await invalidateWikiLangCache(payload.lang);
    await emitOutgoingWebhook("page.created", { pageId: page.id, path: page.path, published: page.isPublished });
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Create failed" },
      { status: 400 },
    );
  }
}
