import { prisma } from "@/lib/db";
import { callAiAgent, extractJsonObject } from "@/lib/ai-agent";
import { invalidateSearchLangCache, invalidateWikiLangCache } from "@/lib/cache";
import { canonicalPageId, findPageCounterpart } from "@/lib/page-counterparts";
import { getEnabledLanguages } from "@/lib/site-config";
import { normalizePath, toSlug } from "@/lib/slug";
import { getSiblingGroupPaths } from "@/lib/wiki-path";
import { emitOutgoingWebhook } from "@/lib/webhook-dispatch";
import { activePageWhere } from "@/lib/page-query";
import { createPageRevision, pageToRevisionSnapshot } from "@/lib/page-revision-snapshot";

type LocalizedPayload = { title: string; contentMd: string };

async function translatePage(input: {
  title: string;
  contentMd: string;
  sourceLang: string;
  targetLang: string;
  agentId?: string | null;
}): Promise<LocalizedPayload> {
  const prompt = `Translate this wiki article from ${input.sourceLang} to ${input.targetLang}.
Preserve markdown structure, code blocks, links paths, and /post wiki syntax.
Return ONLY JSON: {"title":"localized title","contentMd":"localized markdown"}

Title: ${input.title}

Content:
${input.contentMd}`;

  const raw = await callAiAgent(prompt, input.agentId);
  const parsed = extractJsonObject<LocalizedPayload>(raw);
  if (!parsed?.title?.trim() || typeof parsed.contentMd !== "string") {
    throw new Error(`AI localization failed: ${raw.slice(0, 240)}`);
  }
  return { title: parsed.title.trim(), contentMd: parsed.contentMd };
}

export async function localizePageToLanguage(input: {
  pageId: string;
  targetLang: string;
  editorId: string;
  agentId?: string | null;
}) {
  const source = await prisma.page.findFirst({ where: { id: input.pageId, ...activePageWhere } });
  if (!source) throw new Error("Source page not found.");
  if (source.lang === input.targetLang) throw new Error("Target language matches source.");

  const existing = await findPageCounterpart(source, input.targetLang);
  const localized = await translatePage({
    title: source.title,
    contentMd: source.contentMd,
    sourceLang: source.lang,
    targetLang: input.targetLang,
    agentId: input.agentId,
  });

  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.page.findUnique({ where: { id: existing.id } });
      if (!before) throw new Error("Target page not found.");
      const row = await tx.page.update({
        where: { id: existing.id },
        data: {
          title: localized.title,
          contentMd: localized.contentMd,
          originalId: canonicalPageId(source),
        },
      });
      await createPageRevision(tx, row, input.editorId, pageToRevisionSnapshot(before));
      return row;
    });
    await invalidateWikiLangCache(input.targetLang);
    await invalidateSearchLangCache(input.targetLang);
    await emitOutgoingWebhook("page.updated", { pageId: updated.id, path: updated.path, published: updated.isPublished });
    return { page: updated, created: false };
  }

  const tail = source.path.replace(new RegExp(`^/${source.lang}/`), "").split("/").filter(Boolean);
  const slug = tail[tail.length - 1] ?? toSlug(localized.title);
  const parentParts = tail.slice(0, -1);
  const path = normalizePath(input.targetLang, [...parentParts, slug]);

  const created = await prisma.$transaction(async (tx) => {
    const conflict = await tx.page.findFirst({ where: { lang: input.targetLang, path, ...activePageWhere } });
    if (conflict) throw new Error("Target path already exists.");

    const existingSameLang = await tx.page.findMany({
      where: { lang: input.targetLang, ...activePageWhere },
      select: { path: true, navOrder: true },
    });
    const siblingPaths = new Set(getSiblingGroupPaths(existingSameLang, path, input.targetLang));
    const maxNav = existingSameLang
      .filter((p) => siblingPaths.has(p.path))
      .reduce((m, p) => Math.max(m, p.navOrder), 0);

    const row = await tx.page.create({
      data: {
        title: localized.title,
        slug,
        lang: input.targetLang,
        contentMd: localized.contentMd,
        excerpt: source.excerpt,
        isPublished: false,
        path,
        navOrder: maxNav + 10,
        originalId: canonicalPageId(source),
      },
    });
    await createPageRevision(tx, row, input.editorId, null, { created: true });
    return row;
  });

  await invalidateWikiLangCache(input.targetLang);
  await invalidateSearchLangCache(input.targetLang);
  await emitOutgoingWebhook("page.created", { pageId: created.id, path: created.path, published: created.isPublished });
  return { page: created, created: true };
}

export async function localizePageToAllMissing(input: {
  pageId: string;
  targetLangs: string[];
  editorId: string;
  agentId?: string | null;
}) {
  const results: { lang: string; ok: boolean; path?: string; message?: string }[] = [];
  for (const lang of input.targetLangs) {
    try {
      const { page } = await localizePageToLanguage({
        pageId: input.pageId,
        targetLang: lang,
        editorId: input.editorId,
        agentId: input.agentId,
      });
      results.push({ lang, ok: true, path: page.path });
    } catch (error) {
      results.push({
        lang,
        ok: false,
        message: error instanceof Error ? error.message : "Localization failed",
      });
    }
  }
  return results;
}

export async function collectBranchPageIds(rootPath: string, lang: string): Promise<string[]> {
  const pages = await prisma.page.findMany({
    where: {
      lang,
      ...activePageWhere,
      OR: [{ path: rootPath }, { path: { startsWith: `${rootPath}/` } }],
    },
    select: { id: true, path: true },
  });
  return pages
    .sort((a, b) => a.path.split("/").filter(Boolean).length - b.path.split("/").filter(Boolean).length)
    .map((p) => p.id);
}

export type BranchLocalizeResult = {
  pageId: string;
  sourcePath: string;
  lang: string;
  ok: boolean;
  path?: string;
  created?: boolean;
  message?: string;
};

export async function localizeBranchToMissing(input: {
  rootPageId: string;
  editorId: string;
  agentId?: string | null;
  targetLangs?: string[];
}): Promise<{ pageCount: number; results: BranchLocalizeResult[] }> {
  const root = await prisma.page.findFirst({
    where: { id: input.rootPageId, ...activePageWhere },
    select: { id: true, path: true, lang: true, originalId: true },
  });
  if (!root) throw new Error("Root page not found.");

  const enabled = await getEnabledLanguages();
  const targetLangs =
    input.targetLangs?.filter((l) => l !== root.lang && enabled.includes(l)) ??
    enabled.filter((l) => l !== root.lang);

  const pageIds = await collectBranchPageIds(root.path, root.lang);
  const results: BranchLocalizeResult[] = [];

  for (const pageId of pageIds) {
    const source = await prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, path: true, lang: true, originalId: true },
    });
    if (!source) continue;

    for (const targetLang of targetLangs) {
      const existing = await findPageCounterpart(source, targetLang);
      if (existing) {
        results.push({
          pageId: source.id,
          sourcePath: source.path,
          lang: targetLang,
          ok: true,
          path: existing.path,
          created: false,
          message: "Already exists.",
        });
        continue;
      }

      try {
        const { page, created } = await localizePageToLanguage({
          pageId: source.id,
          targetLang,
          editorId: input.editorId,
          agentId: input.agentId,
        });
        results.push({
          pageId: source.id,
          sourcePath: source.path,
          lang: targetLang,
          ok: true,
          path: page.path,
          created,
        });
      } catch (error) {
        results.push({
          pageId: source.id,
          sourcePath: source.path,
          lang: targetLang,
          ok: false,
          message: error instanceof Error ? error.message : "Localization failed",
        });
      }
    }
  }

  return { pageCount: pageIds.length, results };
}

async function translateTitleOnly(input: {
  title: string;
  sourceLang: string;
  targetLang: string;
  agentId?: string | null;
}): Promise<string> {
  const prompt = `Translate this wiki page title from ${input.sourceLang} to ${input.targetLang}.
Return ONLY JSON: {"title":"localized title"}

Title: ${input.title}`;

  const raw = await callAiAgent(prompt, input.agentId);
  const parsed = extractJsonObject<{ title?: string }>(raw);
  if (!parsed?.title?.trim()) {
    throw new Error(`AI title localization failed: ${raw.slice(0, 240)}`);
  }
  return parsed.title.trim();
}

export type TitleLocalizeResult = {
  pageId: string;
  sourcePath: string;
  lang: string;
  ok: boolean;
  path?: string;
  created?: boolean;
  message?: string;
};

export async function localizeTitlesBranch(input: {
  rootPageId: string;
  editorId: string;
  agentId?: string | null;
  targetLangs?: string[];
}): Promise<{ pageCount: number; results: TitleLocalizeResult[] }> {
  const root = await prisma.page.findFirst({
    where: { id: input.rootPageId, ...activePageWhere },
    select: { id: true, path: true, lang: true, originalId: true, title: true },
  });
  if (!root) throw new Error("Root page not found.");

  const enabled = await getEnabledLanguages();
  const targetLangs =
    input.targetLangs?.filter((l) => l !== root.lang && enabled.includes(l)) ??
    enabled.filter((l) => l !== root.lang);

  const pageIds = await collectBranchPageIds(root.path, root.lang);
  const results: TitleLocalizeResult[] = [];

  for (const pageId of pageIds) {
    const source = await prisma.page.findFirst({
      where: { id: pageId, ...activePageWhere },
      select: { id: true, path: true, lang: true, originalId: true, title: true, excerpt: true, isCategory: true, icon: true },
    });
    if (!source) continue;

    for (const targetLang of targetLangs) {
      try {
        const localizedTitle = await translateTitleOnly({
          title: source.title,
          sourceLang: source.lang,
          targetLang,
          agentId: input.agentId,
        });

        const existing = await findPageCounterpart(source, targetLang);
        if (existing) {
          const updated = await prisma.page.update({
            where: { id: existing.id },
            data: { title: localizedTitle, originalId: canonicalPageId(source) },
          });
          await invalidateWikiLangCache(targetLang);
          results.push({
            pageId: source.id,
            sourcePath: source.path,
            lang: targetLang,
            ok: true,
            path: updated.path,
            created: false,
          });
          continue;
        }

        const tail = source.path.replace(new RegExp(`^/${source.lang}/`), "").split("/").filter(Boolean);
        const slug = tail[tail.length - 1] ?? toSlug(localizedTitle);
        const parentParts = tail.slice(0, -1);
        const path = normalizePath(targetLang, [...parentParts, slug]);

        const created = await prisma.$transaction(async (tx) => {
          const conflict = await tx.page.findFirst({ where: { lang: targetLang, path, ...activePageWhere } });
          if (conflict) throw new Error("Target path already exists.");

          const existingSameLang = await tx.page.findMany({
            where: { lang: targetLang, ...activePageWhere },
            select: { path: true, navOrder: true },
          });
          const siblingPaths = new Set(getSiblingGroupPaths(existingSameLang, path, targetLang));
          const maxNav = existingSameLang
            .filter((p) => siblingPaths.has(p.path))
            .reduce((m, p) => Math.max(m, p.navOrder), 0);

          return tx.page.create({
            data: {
              title: localizedTitle,
              slug,
              lang: targetLang,
              path,
              contentMd: "",
              excerpt: source.excerpt,
              isPublished: false,
              isCategory: source.isCategory,
              icon: source.icon,
              navOrder: maxNav + 10,
              originalId: canonicalPageId(source),
            },
          });
        });

        await invalidateWikiLangCache(targetLang);
        await invalidateSearchLangCache(targetLang);
        results.push({
          pageId: source.id,
          sourcePath: source.path,
          lang: targetLang,
          ok: true,
          path: created.path,
          created: true,
        });
      } catch (error) {
        results.push({
          pageId: source.id,
          sourcePath: source.path,
          lang: targetLang,
          ok: false,
          message: error instanceof Error ? error.message : "Title localization failed",
        });
      }
    }
  }

  return { pageCount: pageIds.length, results };
}