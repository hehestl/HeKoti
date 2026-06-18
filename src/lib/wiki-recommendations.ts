import { unstable_cache } from "next/cache";
import type { PathTreeNode } from "@/lib/page-tree";
import {
  findCollectionNode,
  getLangPathTree,
  isWikiLeafArticle,
  type WikiTreePage,
} from "@/lib/wiki-collection";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export type RecommendedArticle = {
  id: string;
  title: string;
  path: string;
  excerpt: string | null;
  source: "sibling" | "neighbor";
};

const DEFAULT_LIMIT = 5;
const EXCERPT_MAX = 120;

export function truncateExcerpt(text: string | null | undefined, max = EXCERPT_MAX): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function toRecommended(
  page: WikiTreePage,
  source: RecommendedArticle["source"],
): RecommendedArticle {
  return {
    id: page.id,
    title: page.title,
    path: page.path,
    excerpt: truncateExcerpt(page.excerpt),
    source,
  };
}

function leafSortKey(node: PathTreeNode<WikiTreePage>): [number, string] {
  const page = node.page!;
  return [page.navOrder ?? 0, page.title];
}

function collectSiblingLeaves(
  parentNode: PathTreeNode<WikiTreePage>,
  currentPath: string,
): RecommendedArticle[] {
  return parentNode.children
    .filter((child) => isWikiLeafArticle(child) && child.page?.path !== currentPath)
    .sort((a, b) => {
      const [ao, as] = leafSortKey(a);
      const [bo, bs] = leafSortKey(b);
      if (ao !== bo) return ao - bo;
      return as.localeCompare(bs, undefined, { sensitivity: "base" });
    })
    .map((child) => toRecommended(child.page!, "sibling"));
}

function collectLeavesFromBranch(
  node: PathTreeNode<WikiTreePage>,
  excludePaths: Set<string>,
  limit: number,
  out: RecommendedArticle[],
): void {
  if (out.length >= limit) return;

  if (isWikiLeafArticle(node) && node.page && !excludePaths.has(node.page.path)) {
    out.push(toRecommended(node.page, "neighbor"));
    return;
  }

  const sortedChildren = [...node.children].sort((a, b) => {
    const sortKey = (n: PathTreeNode<WikiTreePage>): [number, string] => {
      if (n.page) return [n.page.navOrder ?? 0, n.page.title];
      return [1_000_000_000, n.segment];
    };
    const [ao, as] = sortKey(a);
    const [bo, bs] = sortKey(b);
    if (ao !== bo) return ao - bo;
    return as.localeCompare(bs, undefined, { sensitivity: "base" });
  });

  for (const child of sortedChildren) {
    collectLeavesFromBranch(child, excludePaths, limit, out);
    if (out.length >= limit) break;
  }
}

function shuffleRing<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function neighborBranchesByDistance(
  branches: PathTreeNode<WikiTreePage>[],
  parentIndex: number,
  excludePathKey: string,
): PathTreeNode<WikiTreePage>[] {
  const candidates = branches.filter((b) => b.pathKey !== excludePathKey);
  if (candidates.length === 0 || parentIndex < 0) return candidates;

  const rings = new Map<number, PathTreeNode<WikiTreePage>[]>();
  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i]!;
    if (branch.pathKey === excludePathKey) continue;
    const distance = Math.abs(i - parentIndex);
    const ring = rings.get(distance) ?? [];
    ring.push(branch);
    rings.set(distance, ring);
  }

  const ordered: PathTreeNode<WikiTreePage>[] = [];
  for (const distance of [...rings.keys()].sort((a, b) => a - b)) {
    ordered.push(...shuffleRing(rings.get(distance)!));
  }
  return ordered;
}

export function getRecommendedArticles(
  tree: PathTreeNode<WikiTreePage>[],
  currentPath: string,
  lang: string,
  limit = DEFAULT_LIMIT,
): { siblings: RecommendedArticle[]; neighbors: RecommendedArticle[] } {
  const segs = pathSegmentsAfterLang(currentPath, lang);
  if (segs.length === 0) {
    return { siblings: [], neighbors: [] };
  }

  const parentSegs = segs.slice(0, -1);
  const excludePaths = new Set([currentPath]);
  const siblings: RecommendedArticle[] = [];

  if (parentSegs.length === 0) {
    siblings.push(
      ...tree
        .filter((node) => isWikiLeafArticle(node) && node.page?.path !== currentPath)
        .sort((a, b) => {
          const [ao, as] = leafSortKey(a);
          const [bo, bs] = leafSortKey(b);
          if (ao !== bo) return ao - bo;
          return as.localeCompare(bs, undefined, { sensitivity: "base" });
        })
        .map((node) => toRecommended(node.page!, "sibling")),
    );
  } else {
    const parentPath = `/${lang}/${parentSegs.join("/")}`;
    const parentNode = findCollectionNode(tree, parentPath);
    if (parentNode) {
      siblings.push(...collectSiblingLeaves(parentNode, currentPath));
    }
  }

  const neighbors: RecommendedArticle[] = [];
  const neighborLimit = Math.max(0, limit - siblings.length);
  if (neighborLimit === 0) {
    return { siblings: siblings.slice(0, limit), neighbors: [] };
  }

  if (parentSegs.length === 0) {
    const currentIndex = tree.findIndex((n) => n.page?.path === currentPath);
    const orderedBranches = neighborBranchesByDistance(
      tree,
      currentIndex,
      tree[currentIndex]?.pathKey ?? "",
    );
    for (const branch of orderedBranches) {
      collectLeavesFromBranch(branch, excludePaths, neighborLimit, neighbors);
      if (neighbors.length >= neighborLimit) break;
    }
  } else {
    const parentPath = `/${lang}/${parentSegs.join("/")}`;
    const parentNode = findCollectionNode(tree, parentPath);
    if (!parentNode) {
      return { siblings: siblings.slice(0, limit), neighbors: [] };
    }

    let branchList: PathTreeNode<WikiTreePage>[];
    let parentIndex: number;

    if (parentSegs.length === 1) {
      branchList = tree;
      parentIndex = tree.findIndex((n) => n.pathKey === parentPath);
    } else {
      const grandparentPath = `/${lang}/${parentSegs.slice(0, -1).join("/")}`;
      const grandparentNode = findCollectionNode(tree, grandparentPath);
      if (!grandparentNode) {
        return { siblings: siblings.slice(0, limit), neighbors: [] };
      }
      branchList = grandparentNode.children;
      parentIndex = branchList.findIndex((n) => n.pathKey === parentPath);
    }

    const orderedBranches = neighborBranchesByDistance(branchList, parentIndex, parentPath);
    for (const branch of orderedBranches) {
      collectLeavesFromBranch(branch, excludePaths, neighborLimit, neighbors);
      if (neighbors.length >= neighborLimit) break;
    }
  }

  return {
    siblings: siblings.slice(0, limit),
    neighbors: neighbors.slice(0, neighborLimit),
  };
}

async function loadRecommendedArticles(lang: string, currentPath: string) {
  const tree = await getLangPathTree(lang);
  return getRecommendedArticles(tree, currentPath, lang);
}

export const getCachedRecommendedArticles = unstable_cache(
  loadRecommendedArticles,
  ["wiki-recommendations"],
  { revalidate: 300 },
);
