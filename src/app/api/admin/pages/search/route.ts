import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { safeLang, getDictionary } from "@/lib/i18n";
import { formatSearchSnippet, pickBestSearchLine } from "@/lib/page-search-index";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import { wikiHrefFromDbPath } from "@/lib/wiki-collection";
import { buildSearchSnippet, parseSearchTerms, searchAdminWikiPages } from "@/lib/wiki-search";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const lang = safeLang(searchParams.get("lang") ?? "en");
    const query = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "12") || 12, 1), 30);

    if (query.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const terms = parseSearchTerms(query);
    const dict = await getDictionary(lang);
    const results = await searchAdminWikiPages(lang, query, limit);

    const items = results.map((item) => {
      const match = item.searchText ? pickBestSearchLine(item.searchText, terms) : null;
      const fromIndex = match
        ? formatSearchSnippet(match, { snippetHeadingPrefix: dict.search.snippetHeadingPrefix }, terms, 100)
        : "";
      const snippet =
        fromIndex || buildSearchSnippet(item.excerpt?.trim() || item.title, terms, 100);
      const pathTail = pathSegmentsAfterLang(item.path, lang).join("/");

      return {
        id: item.id,
        title: item.title,
        path: item.path,
        pathTail,
        href: wikiHrefFromDbPath(lang, item.path),
        snippet,
        isPublished: item.isPublished,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
