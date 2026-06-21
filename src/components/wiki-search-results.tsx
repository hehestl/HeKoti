import Link from "next/link";
import { formatSearchSnippet, pickBestSearchLine } from "@/lib/page-search-index";
import { wikiHrefFromDbPath } from "@/lib/wiki-collection";
import { parseSearchTerms, splitSearchHighlight } from "@/lib/wiki-search";

type SearchResult = {
  id: string;
  title: string;
  path: string;
  excerpt: string | null;
  searchText?: string;
  updatedAt: Date;
};

function SearchHighlightedText({ text, terms }: { text: string; terms: string[] }) {
  const parts = splitSearchHighlight(text, terms);
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="wiki-search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function resultDescription(
  item: SearchResult,
  terms: string[],
  labels: { snippetHeadingPrefix: string },
): string | null {
  if (item.excerpt?.trim()) return item.excerpt.trim();
  if (!item.searchText?.trim()) return null;
  const match = pickBestSearchLine(item.searchText, terms);
  if (!match) return null;
  return formatSearchSnippet(match, { snippetHeadingPrefix: labels.snippetHeadingPrefix }, terms, 140);
}

export function WikiSearchResults({
  lang,
  query,
  results,
  partial = false,
  dict,
}: {
  lang: string;
  query: string;
  results: SearchResult[];
  partial?: boolean;
  dict: {
    resultsTitle: string;
    noResults: string;
    updatedAt: string;
    partialResultsHint: string;
    backHome: string;
    tryDifferentWords: string;
    snippetHeadingPrefix: string;
  };
}) {
  const title = dict.resultsTitle.replace("{q}", query);
  const terms = parseSearchTerms(query);

  return (
    <div className="wiki-search-results">
      <h1 className="wiki-search-results-title">{title}</h1>
      {partial && results.length > 0 ? (
        <p className="wiki-search-results-partial-hint">{dict.partialResultsHint}</p>
      ) : null}
      {results.length > 0 ? (
        <ul className="wiki-collection-list">
          {results.map((item) => {
            const description = resultDescription(item, terms, dict);
            return (
              <li key={item.id}>
                <Link href={wikiHrefFromDbPath(lang, item.path)} prefetch={false} className="wiki-collection-row">
                  <span className="wiki-collection-row-body">
                    <span className="wiki-collection-row-title">
                      <SearchHighlightedText text={item.title} terms={terms} />
                    </span>
                    {description ? (
                      <span className="wiki-collection-row-desc">
                        <SearchHighlightedText text={description} terms={terms} />
                      </span>
                    ) : null}
                    <span className="wiki-collection-row-meta">
                      {dict.updatedAt.replace(
                        "{date}",
                        item.updatedAt.toLocaleDateString(lang, { year: "numeric", month: "short", day: "2-digit" }),
                      )}
                    </span>
                  </span>
                  <span className="wiki-collection-row-chevron" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="wiki-search-results-empty">
          <p>{dict.noResults}</p>
          <div className="wiki-search-results-empty-actions">
            <p>{dict.tryDifferentWords}</p>
            <Link href={`/${lang}`}>{dict.backHome}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
