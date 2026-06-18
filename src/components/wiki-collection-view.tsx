import Link from "next/link";
import { ChevronRight, FileText, Folder } from "lucide-react";
import type { PathTreeNode } from "@/lib/page-tree";
import { env } from "@/lib/env";
import {
  buildCatalogJsonLd,
  collectionDescription,
  collectionTitle,
  countDescendantPages,
  getNodeUrl,
  isWikiCatalogNode,
  isWikiLeafArticle,
  type WikiTreePage,
} from "@/lib/wiki-collection";

export function WikiCollectionView({
  node,
  lang,
  excerptByPath,
  dict,
  bodyHtml,
  pagePath,
}: {
  node: PathTreeNode<WikiTreePage>;
  lang: string;
  excerptByPath: Map<string, string | null>;
  dict: {
    articlesCount: string;
    empty: string;
    defaultDescription: string;
    updatedAt: string;
    articlesNavLabel: string;
  };
  bodyHtml?: string;
  pagePath: string;
}) {
  const title = collectionTitle(node);
  const description = collectionDescription(node, dict.defaultDescription, excerptByPath);
  const total = countDescendantPages(node);
  const catalogChildren = node.children.map((child) => ({
    title: collectionTitle(child),
    url: getNodeUrl(child, lang),
  }));
  const catalogJsonLd = buildCatalogJsonLd(title, description, pagePath, catalogChildren, env.APP_URL);

  return (
    <article className="wiki-collection">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogJsonLd) }}
      />
      <header>
        <h1 className="wiki-collection-title">{title}</h1>
        {description ? <p className="wiki-collection-desc">{description}</p> : null}
      </header>

      {bodyHtml ? (
        <div
          className="wiki-collection-body wiki-article-body"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : null}

      <p className="wiki-collection-count">{dict.articlesCount.replace("{n}", String(total))}</p>

      {node.children.length > 0 ? (
        <nav aria-label={dict.articlesNavLabel}>
          <ul className="wiki-collection-list" role="list">
            {node.children.map((child) => {
              const childTitle = collectionTitle(child);
              const href = getNodeUrl(child, lang);
              const isCollection = isWikiCatalogNode(child);
              const childDesc =
                isWikiLeafArticle(child) && child.page?.excerpt ? child.page.excerpt : null;

              return (
                <li key={child.pathKey}>
                  <Link href={href} prefetch={false} className="wiki-collection-row">
                    <span className="wiki-collection-row-icon" aria-hidden>
                      {isCollection ? <Folder size={18} /> : <FileText size={18} />}
                    </span>
                    <span className="wiki-collection-row-body">
                      <span className="wiki-collection-row-title">{childTitle}</span>
                      {childDesc ? <span className="wiki-collection-row-desc">{childDesc}</span> : null}
                    </span>
                    <ChevronRight size={18} className="wiki-collection-row-chevron" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        <p className="wiki-collection-empty">{dict.empty}</p>
      )}
    </article>
  );
}
