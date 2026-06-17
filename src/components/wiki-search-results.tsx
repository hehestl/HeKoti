import Link from "next/link";
import { wikiHrefFromDbPath } from "@/lib/wiki-collection";

type SearchResult = {
  id: string;
  title: string;
  path: string;
  excerpt: string | null;
  updatedAt: Date;
};

export function WikiSearchResults({
  lang,
  query,
  results,
  dict,
}: {
  lang: string;
  query: string;
  results: SearchResult[];
  dict: {
    resultsTitle: string;
    noResults: string;
    updatedAt: string;
  };
}) {
  const title = dict.resultsTitle.replace("{q}", query);

  return (
    <div className="wiki-search-results">
      <h1 className="wiki-search-results-title">{title}</h1>
      {results.length > 0 ? (
        <ul className="wiki-collection-list">
          {results.map((item) => (
            <li key={item.id}>
              <Link href={wikiHrefFromDbPath(lang, item.path)} prefetch={false} className="wiki-collection-row">
                <span className="wiki-collection-row-body">
                  <span className="wiki-collection-row-title">{item.title}</span>
                  {item.excerpt ? <span className="wiki-collection-row-desc">{item.excerpt}</span> : null}
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
          ))}
        </ul>
      ) : (
        <p className="wiki-search-results-empty">{dict.noResults}</p>
      )}
    </div>
  );
}
