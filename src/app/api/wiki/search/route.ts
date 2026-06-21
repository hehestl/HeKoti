import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeLang, getDictionary } from "@/lib/i18n";
import { formatSearchSnippet, pickBestSearchLine } from "@/lib/page-search-index";
import { wikiHrefFromDbPath } from "@/lib/wiki-collection";
import { buildSearchSnippet, parseSearchTerms, searchPublishedPagesWithFallback } from "@/lib/wiki-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = safeLang(searchParams.get("lang") ?? "en");
  const query = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "8") || 8, 1), 20);

  if (!env.PUBLIC_READ_MODE) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
  }

  const terms = parseSearchTerms(query);
  if (terms.length < 2 && query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const cacheKey = `search:suggest:${lang}:${query.toLowerCase()}:${limit}`;
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  const dict = await getDictionary(lang);
  const { results } = await searchPublishedPagesWithFallback(lang, query, limit);

  const items = results.map((item) => {
    const match = item.searchText ? pickBestSearchLine(item.searchText, terms) : null;
    const fromIndex = match
      ? formatSearchSnippet(match, { snippetHeadingPrefix: dict.search.snippetHeadingPrefix }, terms, 100)
      : "";
    const snippet =
      fromIndex ||
      buildSearchSnippet(item.excerpt?.trim() || item.title, terms, 100);

    return {
      id: item.id,
      title: item.title,
      path: item.path,
      href: wikiHrefFromDbPath(lang, item.path),
      snippet,
    };
  });

  const payload = { items };
  await setCached(cacheKey, JSON.stringify(payload), 60);
  return NextResponse.json(payload);
}
