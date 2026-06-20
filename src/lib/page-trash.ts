import { prisma } from "@/lib/db";
import { invalidateSearchLangCache, invalidateWikiLangCache } from "@/lib/cache";
import { activePageWhere } from "@/lib/page-query";
import { wikiLinksCacheKey } from "@/lib/wiki-link-index";
import { delCached } from "@/lib/cache";

export const SOFT_DELETE_RETENTION_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function purgeAtFromDeletedAt(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + SOFT_DELETE_RETENTION_DAYS * MS_PER_DAY);
}

export function daysUntilPurge(deletedAt: Date, now = new Date()): number {
  const purgeAt = purgeAtFromDeletedAt(deletedAt);
  return Math.max(0, Math.ceil((purgeAt.getTime() - now.getTime()) / MS_PER_DAY));
}

export function isPurgeEligible(deletedAt: Date, now = new Date()): boolean {
  return deletedAt.getTime() + SOFT_DELETE_RETENTION_DAYS * MS_PER_DAY <= now.getTime();
}

function subtreeWhere(lang: string, rootPath: string, includeDeleted: boolean) {
  return {
    lang,
    ...(includeDeleted ? { deletedAt: { not: null } } : activePageWhere),
    OR: [{ path: rootPath }, { path: { startsWith: `${rootPath}/` } }],
  };
}

export async function softDeletePageCascade(pageId: string) {
  const target = await prisma.page.findFirst({
    where: { id: pageId, ...activePageWhere },
  });
  if (!target) throw new Error("Page not found.");
  if (target.systemKey) throw new Error("SYSTEM_PAGE_PROTECTED");

  const now = new Date();
  const deletedIds = await prisma.$transaction(async (tx) => {
    const subTree = await tx.page.findMany({
      where: {
        lang: target.lang,
        deletedAt: null,
        OR: [{ id: target.id }, { path: { startsWith: `${target.path}/` } }],
      },
      select: { id: true },
    });
    const ids = subTree.map((p) => p.id);
    await tx.page.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: now },
    });
    return ids;
  });

  await invalidateWikiLangCache(target.lang);
  await invalidateSearchLangCache(target.lang);

  return { page: target, deletedIds, deletedAt: now, purgeAt: purgeAtFromDeletedAt(now) };
}

export async function restorePageSubtree(pageId: string) {
  const root = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: { not: null } },
  });
  if (!root || !root.deletedAt) throw new Error("Page not in trash.");

  const occupant = await prisma.page.findFirst({
    where: { lang: root.lang, path: root.path, ...activePageWhere },
    select: { id: true, title: true },
  });
  if (occupant) {
    const err = new Error("PATH_OCCUPIED") as Error & { occupantTitle?: string };
    err.occupantTitle = occupant.title;
    throw err;
  }

  const batchMs = root.deletedAt.getTime();
  const restoredIds = await prisma.$transaction(async (tx) => {
    const candidates = await tx.page.findMany({
      where: {
        lang: root.lang,
        deletedAt: { not: null },
        OR: [{ id: root.id }, { path: { startsWith: `${root.path}/` } }],
      },
      select: { id: true, path: true, deletedAt: true },
    });

    const toRestore = candidates.filter((p) => p.deletedAt?.getTime() === batchMs);
    for (const row of toRestore) {
      const conflict = await tx.page.findFirst({
        where: { lang: root.lang, path: row.path, ...activePageWhere },
      });
      if (conflict) {
        const err = new Error("PATH_OCCUPIED") as Error & { occupantTitle?: string };
        err.occupantTitle = conflict.title;
        throw err;
      }
    }

    const ids = toRestore.map((p) => p.id);
    await tx.page.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });
    return ids;
  });

  await invalidateWikiLangCache(root.lang);
  await invalidateSearchLangCache(root.lang);

  return { page: root, restoredIds };
}

export async function purgePageSubtree(pageId: string, force = false) {
  const root = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: { not: null } },
  });
  if (!root?.deletedAt) throw new Error("Page not in trash.");
  if (!force && !isPurgeEligible(root.deletedAt)) {
    throw new Error("Purge not allowed yet.");
  }

  const purgedIds = await prisma.$transaction(async (tx) => {
    const subTree = await tx.page.findMany({
      where: subtreeWhere(root.lang, root.path, true),
      select: { id: true },
    });
    const ids = subTree.map((p) => p.id);
    await tx.page.deleteMany({ where: { id: { in: ids } } });
    return ids;
  });

  await invalidateWikiLangCache(root.lang);
  await invalidateSearchLangCache(root.lang);
  await delCached(wikiLinksCacheKey(root.lang));

  return { page: root, purgedIds };
}

export async function purgeExpiredPages(now = new Date()) {
  const cutoff = new Date(now.getTime() - SOFT_DELETE_RETENTION_DAYS * MS_PER_DAY);
  const expired = await prisma.page.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, lang: true, path: true },
  });

  const langs = new Set<string>();
  for (const row of expired) {
    langs.add(row.lang);
    await prisma.page.delete({ where: { id: row.id } });
  }

  for (const lang of langs) {
    await invalidateWikiLangCache(lang);
    await invalidateSearchLangCache(lang);
    await delCached(wikiLinksCacheKey(lang));
  }

  return { purgedCount: expired.length, langs: [...langs] };
}

export async function listTrashPages() {
  await purgeExpiredPages();
  return prisma.page.findMany({
    where: { deletedAt: { not: null } },
    orderBy: [{ deletedAt: "desc" }, { path: "asc" }],
    select: {
      id: true,
      title: true,
      path: true,
      lang: true,
      isCategory: true,
      icon: true,
      deletedAt: true,
    },
  });
}
