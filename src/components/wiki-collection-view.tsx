import Link from "next/link";
import { ChevronRight, FileText, Folder } from "lucide-react";
import type { PathTreeNode } from "@/lib/page-tree";
import {
  breadcrumbChain,
  collectionDescription,
  collectionTitle,
  countDescendantPages,
  getNodeUrl,
  isCollectionNode,
  type WikiTreePage,
} from "@/lib/wiki-collection";

export function WikiCollectionView({
  node,
  lang,
  tree,
  excerptByPath,
  dict,
}: {
  node: PathTreeNode<WikiTreePage>;
  lang: string;
  tree: PathTreeNode<WikiTreePage>[];
  excerptByPath: Map<string, string | null>;
  dict: {
    allCollections: string;
    articlesCount: string;
    empty: string;
    defaultDescription: string;
    updatedAt: string;
  };
}) {
  const crumbs = breadcrumbChain(node, lang, tree, dict.allCollections);
  const title = collectionTitle(node);
  const description = collectionDescription(node, dict.defaultDescription, excerptByPath);
  const total = countDescendantPages(node);

  return (
    <article className="wiki-collection">
      <nav className="wiki-breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="wiki-breadcrumb-item">
            {i > 0 ? <span className="wiki-breadcrumb-sep" aria-hidden>{">"}</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} prefetch={false}>
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <h1 className="wiki-collection-title">{title}</h1>
      <p className="wiki-collection-desc">{description}</p>
      <p className="wiki-collection-count">{dict.articlesCount.replace("{n}", String(total))}</p>

      {node.children.length > 0 ? (
        <ul className="wiki-collection-list">
          {node.children.map((child) => {
            const childTitle = collectionTitle(child);
            const href = getNodeUrl(child, lang);
            const isCollection = isCollectionNode(child);
            const childCount = countDescendantPages(child);
            const childDesc =
              !isCollection && child.page?.excerpt
                ? child.page.excerpt
                : isCollection
                  ? dict.articlesCount.replace("{n}", String(childCount))
                  : null;

            return (
              <li key={child.pathKey}>
                <Link href={href} prefetch={false} className="wiki-collection-row">
                  <span className="wiki-collection-row-icon" aria-hidden>
                    {isCollection ? <Folder size={18} /> : <FileText size={18} />}
                  </span>
                  <span className="wiki-collection-row-body">
                    <span className="wiki-collection-row-title">{childTitle}</span>
                    {childDesc ? <span className="wiki-collection-row-desc">{childDesc}</span> : null}
                    {!isCollection && child.page?.updatedAt ? (
                      <span className="wiki-collection-row-meta">
                        {dict.updatedAt.replace(
                          "{date}",
                          child.page.updatedAt.toLocaleDateString(lang, {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          }),
                        )}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={18} className="wiki-collection-row-chevron" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="wiki-collection-empty">{dict.empty}</p>
      )}
    </article>
  );
}
