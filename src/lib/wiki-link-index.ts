import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCached, setCached } from "@/lib/cache";
import type { WikiLinkPage } from "@/lib/wiki-link-expand";

export function wikiLinksCacheKey(lang: string) {
  return `wiki-links:${lang}`;
}

async function loadWikiLinkPages(lang: string): Promise<WikiLinkPage[]> {
  const key = wikiLinksCacheKey(lang);
  const cached = await getCached(key);
  if (cached) {
    return JSON.parse(cached) as WikiLinkPage[];
  }

  const pages = await prisma.page.findMany({
    where: { lang, isPublished: true },
    select: { path: true, title: true },
  });
  await setCached(key, JSON.stringify(pages));
  return pages;
}

/** Published page index for `/post` wiki-link resolution (Redis/LRU + per-request dedup). */
export const getWikiLinkPages = cache(loadWikiLinkPages);