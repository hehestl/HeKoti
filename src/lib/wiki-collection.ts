import { cache } from "react";
import { prisma } from "@/lib/db";
import { activePageWhere, wikiPageWhere } from "@/lib/page-query";
import { buildPathTree, type PathTreeNode } from "@/lib/page-tree";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export type WikiTreePage = {
  id: string;
  path: string;
  title: string;
  navOrder?: number;
  excerpt?: string | null;
  updatedAt?: Date;
  icon?: string | null;
  isCategory?: boolean;
};

export function humanizeSegment(segment: string): string {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type WikiNodeType = "catalog" | "article" | "missing";

export function isCollectionNode<T extends { path: string }>(node: PathTreeNode<T>): boolean {
  return node.children.length > 0;
}

export function isWikiCatalogNode(node: PathTreeNode<{ path: string }> | null): boolean {
  if (!node) return false;
  return node.children.length > 0;
}

export function isWikiLeafArticle(node: PathTreeNode<{ path: string }> | null): boolean {
  return !isWikiCatalogNode(node) && !!node?.page;
}

export function getWikiNodeType(node: PathTreeNode<{ path: string }> | null): WikiNodeType {
  if (isWikiCatalogNode(node)) return "catalog";
  if (node?.page) return "article";
  return "missing";
}

export function hasPublishedPage(page: { isPublished: boolean } | null | undefined): boolean {
  return page?.isPublished === true;
}

export function getCollectionUrl(node: PathTreeNode<{ path: string }>, lang: string): string {
  const segs = pathSegmentsAfterLang(node.pathKey, lang);
  if (segs.length === 0) return `/${lang}`;
  return `/${lang}/wiki/${segs.join("/")}`;
}

export function getNodeUrl(node: PathTreeNode<{ path: string }>, lang: string): string {
  if (node.page) return getCollectionUrl(node, lang);
  if (isCollectionNode(node)) return getCollectionUrl(node, lang);
  return `/${lang}`;
}

export function getFirstDescendantPage<T extends { path: string }>(node: PathTreeNode<T>): T | null {
  if (node.page) return node.page;
  for (const child of node.children) {
    const page = getFirstDescendantPage(child);
    if (page) return page;
  }
  return null;
}

export function countDescendantPages<T extends { path: string }>(node: PathTreeNode<T>): number {
  let count = node.page ? 1 : 0;
  for (const child of node.children) {
    count += countDescendantPages(child);
  }
  return count;
}

export function collectionTitle<T extends { path: string; title: string }>(node: PathTreeNode<T>): string {
  if (node.page?.title) return node.page.title;
  if (node.segment) return humanizeSegment(node.segment);
  return "";
}

export function collectionDescription<T extends WikiTreePage>(
  node: PathTreeNode<T>,
  fallback: string,
  excerptByPath?: Map<string, string | null | undefined>,
): string {
  if (node.page?.excerpt?.trim()) return node.page.excerpt.trim();
  if (node.page?.path && excerptByPath?.get(node.page.path)?.trim()) {
    return excerptByPath.get(node.page.path)!.trim();
  }
  const first = getFirstDescendantPage(node);
  if (first) {
    if (first.excerpt?.trim()) return first.excerpt.trim();
    const fromMap = excerptByPath?.get(first.path);
    if (fromMap?.trim()) return fromMap.trim();
  }
  return fallback;
}

export function findCollectionNode<T extends { path: string }>(
  tree: PathTreeNode<T>[],
  dbPath: string,
): PathTreeNode<T> | null {
  const walk = (nodes: PathTreeNode<T>[]): PathTreeNode<T> | null => {
    for (const node of nodes) {
      if (node.pathKey === dbPath) return node;
      const hit = walk(node.children);
      if (hit) return hit;
    }
    return null;
  };
  return walk(tree);
}

export type BreadcrumbItem = { label: string; href?: string };

export function breadcrumbChain<T extends { path: string; title: string }>(
  node: PathTreeNode<T>,
  lang: string,
  tree: PathTreeNode<T>[],
  allCollectionsLabel: string,
): BreadcrumbItem[] {
  const chain: BreadcrumbItem[] = [{ label: allCollectionsLabel, href: `/${lang}` }];
  const segs = pathSegmentsAfterLang(node.pathKey, lang);

  for (let i = 0; i < segs.length; i++) {
    const partialPath = `/${lang}/${segs.slice(0, i + 1).join("/")}`;
    const partialNode = findCollectionNode(tree, partialPath);
    const label = partialNode ? collectionTitle(partialNode) : humanizeSegment(segs[i]!);
    const isLast = i === segs.length - 1;
    chain.push(
      isLast
        ? { label }
        : { label, href: `/${lang}/wiki/${segs.slice(0, i + 1).join("/")}` },
    );
  }

  return chain;
}

export function breadcrumbChainForPage(
  pagePath: string,
  pageTitle: string,
  lang: string,
  tree: PathTreeNode<WikiTreePage>[],
  allCollectionsLabel: string,
): BreadcrumbItem[] {
  const segs = pathSegmentsAfterLang(pagePath, lang);
  if (segs.length === 0) {
    return [{ label: allCollectionsLabel, href: `/${lang}` }, { label: pageTitle }];
  }

  const chain: BreadcrumbItem[] = [{ label: allCollectionsLabel, href: `/${lang}` }];

  for (let i = 0; i < segs.length - 1; i++) {
    const partialPath = `/${lang}/${segs.slice(0, i + 1).join("/")}`;
    const partialNode = findCollectionNode(tree, partialPath);
    const label = partialNode ? collectionTitle(partialNode) : humanizeSegment(segs[i]!);
    chain.push({ label, href: `/${lang}/wiki/${segs.slice(0, i + 1).join("/")}` });
  }

  chain.push({ label: pageTitle });
  return chain;
}

export function staticBreadcrumbChain(
  lang: string,
  allCollectionsLabel: string,
  currentLabel: string,
): BreadcrumbItem[] {
  return [
    { label: allCollectionsLabel, href: `/${lang}` },
    { label: currentLabel },
  ];
}

function breadcrumbAbsUrl(appUrl: string, path: string): string {
  const base = appUrl.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  pagePath: string,
  appUrl: string,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => {
      const isLast = i === items.length - 1;
      const path = crumb.href ?? (isLast ? pagePath : undefined);
      const entry: Record<string, string | number> = {
        "@type": "ListItem",
        position: i + 1,
        name: crumb.label,
      };
      if (path) entry.item = breadcrumbAbsUrl(appUrl, path);
      return entry;
    }),
  };
}

export function buildCatalogJsonLd(
  title: string,
  description: string,
  pagePath: string,
  children: { title: string; url: string }[],
  appUrl: string,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: breadcrumbAbsUrl(appUrl, pagePath),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: children.length,
      itemListElement: children.map((child, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: child.title,
        url: breadcrumbAbsUrl(appUrl, child.url),
      })),
    },
  };
}

export function formatWikiDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

async function loadLangPages(lang: string): Promise<WikiTreePage[]> {
  return prisma.page.findMany({
    where: { lang, isPublished: true, ...wikiPageWhere },
    orderBy: [{ navOrder: "asc" }, { title: "asc" }],
    take: 600,
    select: {
      id: true,
      title: true,
      path: true,
      navOrder: true,
      excerpt: true,
      updatedAt: true,
      icon: true,
      isCategory: true,
    },
  });
}

const getLangPages = cache(loadLangPages);

export const getLangPathTree = cache(async (lang: string) => {
  const pages = await getLangPages(lang);
  return buildPathTree(pages, lang);
});

export async function getExcerptByPath(lang: string): Promise<Map<string, string | null>> {
  const pages = await getLangPages(lang);
  return new Map(pages.map((p) => [p.path, p.excerpt ?? null]));
}

export function wikiHrefFromDbPath(lang: string, path: string): string {
  const prefix = `/${lang}/`;
  if (!path.startsWith(prefix)) return `/${lang}`;
  const tail = path.slice(prefix.length);
  return `/${lang}/wiki/${tail}`;
}
