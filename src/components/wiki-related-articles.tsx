import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RecommendedArticle } from "@/lib/wiki-recommendations";
import { wikiPublicHref } from "@/lib/wiki-path";

type ArticleDict = {
  relatedTitle: string;
  relatedNeighborTitle: string;
};

function RelatedSection({
  title,
  items,
  lang,
}: {
  title: string;
  items: RecommendedArticle[];
  lang: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="wiki-related-section">
      <h2 className="wiki-related-title">{title}</h2>
      <ul className="wiki-collection-list" role="list">
        {items.map((item) => (
          <li key={item.path}>
            <Link
              href={wikiPublicHref(lang, item.path)}
              prefetch={false}
              className="wiki-collection-row"
            >
              <span className="wiki-collection-row-body">
                <span className="wiki-collection-row-title">{item.title}</span>
                {item.excerpt ? (
                  <span className="wiki-collection-row-desc">{item.excerpt}</span>
                ) : null}
              </span>
              <ChevronRight size={18} className="wiki-collection-row-chevron" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WikiRelatedArticles({
  siblings,
  neighbors,
  lang,
  dict,
}: {
  siblings: RecommendedArticle[];
  neighbors: RecommendedArticle[];
  lang: string;
  dict: ArticleDict;
}) {
  if (siblings.length === 0 && neighbors.length === 0) return null;

  return (
    <div className="wiki-related-articles">
      <RelatedSection title={dict.relatedTitle} items={siblings} lang={lang} />
      <RelatedSection title={dict.relatedNeighborTitle} items={neighbors} lang={lang} />
    </div>
  );
}
