import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scoreSearchTextLines } from "@/lib/page-search-index";
import { wikiPageWhere } from "@/lib/page-query";

export type WikiSearchPage = {
  id: string;
  title: string;
  path: string;
  excerpt: string | null;
  updatedAt: Date;
  searchText?: string;
};

const TERM_EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function normalizeSearchTerm(raw: string): string {
  return raw.trim().replace(TERM_EDGE_PUNCT, "").toLowerCase();
}

export function parseSearchTerms(q: string): string[] {
  return q
    .trim()
    .split(/\s+/)
    .map(normalizeSearchTerm)
    .filter(Boolean)
    .slice(0, 6);
}

function termMatchFields(t: string): Prisma.PageWhereInput[] {
  return [
    { title: { contains: t, mode: "insensitive" as const } },
    { searchText: { contains: t, mode: "insensitive" as const } },
    { excerpt: { contains: t, mode: "insensitive" as const } },
    { slug: { contains: t, mode: "insensitive" as const } },
    {
      AND: [
        { searchText: "" },
        { contentMd: { contains: t, mode: "insensitive" as const } },
      ],
    },
  ];
}

export function buildSearchWhere(terms: string[]): Prisma.PageWhereInput {
  if (terms.length === 0) return {};
  return {
    AND: terms.map((t) => ({ OR: termMatchFields(t) })),
  };
}

export function buildSearchWhereOr(terms: string[]): Prisma.PageWhereInput {
  if (terms.length === 0) return {};
  return {
    OR: terms.map((t) => ({ OR: termMatchFields(t) })),
  };
}

export function rankSearchResults<T extends WikiSearchPage>(items: T[], terms: string[]): T[] {
  if (terms.length === 0) return items;

  const scored = items.map((item) => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const searchText = item.searchText ?? "";

    const allInTitle = terms.every((t) => titleLower.includes(t));
    if (allInTitle) score += 10;

    for (const t of terms) {
      if (titleLower.includes(t)) score += 3;
    }

    score += scoreSearchTextLines(searchText, terms, item.excerpt);

    return { item, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.updatedAt.getTime() - a.item.updatedAt.getTime();
  });

  return scored.map(({ item }) => item);
}

export function buildSearchSnippet(text: string | null | undefined, terms: string[], maxLen = 120): string {
  if (!text?.trim()) return "";
  const lower = text.toLowerCase();
  let hitIndex = -1;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx >= 0 && (hitIndex < 0 || idx < hitIndex)) hitIndex = idx;
  }
  if (hitIndex < 0) {
    const trimmed = text.trim();
    return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen - 1)}…`;
  }

  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, hitIndex - half);
  const end = Math.min(text.length, start + maxLen);
  const slice = text.slice(start, end).trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

export function stripSearchText<T extends { searchText?: string }>(items: T[]): Omit<T, "searchText">[] {
  return items.map(({ searchText: _searchText, ...rest }) => rest);
}

async function fetchPublishedPages(
  lang: string,
  whereExtra: Prisma.PageWhereInput,
  take: number,
): Promise<WikiSearchPage[]> {
  return prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...wikiPageWhere,
      ...whereExtra,
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      path: true,
      excerpt: true,
      updatedAt: true,
      searchText: true,
    },
  });
}

export async function searchPublishedPages(
  lang: string,
  q: string,
  take = 80,
): Promise<Omit<WikiSearchPage, "searchText">[]> {
  const terms = parseSearchTerms(q);
  if (terms.length === 0) return [];

  const rows = await fetchPublishedPages(lang, buildSearchWhere(terms), take);
  return stripSearchText(rankSearchResults(rows, terms));
}

export async function searchPublishedPagesOr(
  lang: string,
  q: string,
  take = 80,
): Promise<Omit<WikiSearchPage, "searchText">[]> {
  const terms = parseSearchTerms(q);
  if (terms.length === 0) return [];

  const rows = await fetchPublishedPages(lang, buildSearchWhereOr(terms), take);
  return stripSearchText(rankSearchResults(rows, terms));
}

export async function searchPublishedPagesWithFallback(
  lang: string,
  q: string,
  take = 80,
): Promise<{ results: (Omit<WikiSearchPage, "searchText"> & { searchText?: string })[]; partial: boolean }> {
  const terms = parseSearchTerms(q);
  if (terms.length === 0) return { results: [], partial: false };

  let rows = await fetchPublishedPages(lang, buildSearchWhere(terms), take);
  let partial = false;

  if (rows.length === 0 && terms.length > 1) {
    rows = await fetchPublishedPages(lang, buildSearchWhereOr(terms), take);
    partial = rows.length > 0;
  }

  const ranked = rankSearchResults(rows, terms);
  return { results: ranked, partial };
}

export type SearchHighlightPart = { text: string; match: boolean };

export function splitSearchHighlight(text: string, terms: string[]): SearchHighlightPart[] {
  if (!text || terms.length === 0) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];

  for (const term of terms) {
    if (!term) continue;
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(term, from);
      if (idx < 0) break;
      ranges.push({ start: idx, end: idx + term.length });
      from = idx + term.length;
    }
  }

  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const parts: SearchHighlightPart[] = [];
  let cursor = 0;
  for (const { start, end } of merged) {
    if (cursor < start) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
