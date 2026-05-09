import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export type PathTreeNode<T extends { path: string }> = {
  /** URL prefix for this node, e.g. `/en/docs/api`. */
  pathKey: string;
  segment: string;
  page: T | null;
  children: PathTreeNode<T>[];
};

/** Builds a path tree (wiki URLs as nested folders). Intermediate segments exist if deeper pages do. */
export function buildPathTree<T extends { path: string; title: string; navOrder?: number }>(
  pages: T[],
  lang: string,
): PathTreeNode<T>[] {
  const root: PathTreeNode<T> = {
    pathKey: `/${lang}`,
    segment: "",
    page: null,
    children: [],
  };

  for (const page of pages) {
    const segs = pathSegmentsAfterLang(page.path, lang);
    if (segs.length === 0) continue;

    let node = root;
    let pathSoFar = `/${lang}`;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!;
      pathSoFar += `/${seg}`;
      let child = node.children.find((c) => c.segment === seg);
      if (!child) {
        child = { pathKey: pathSoFar, segment: seg, page: null, children: [] };
        node.children.push(child);
      }
      if (i === segs.length - 1) {
        child.page = page;
      }
      node = child;
    }
  }

  const sortKey = (n: PathTreeNode<T>): [number, string] => {
    if (n.page) {
      return [n.page.navOrder ?? 0, n.page.title];
    }
    return [1_000_000_000, n.segment];
  };

  const sortChildren = (n: PathTreeNode<T>) => {
    n.children.sort((a, b) => {
      const [ao, as] = sortKey(a);
      const [bo, bs] = sortKey(b);
      if (ao !== bo) return ao - bo;
      return as.localeCompare(bs, undefined, { sensitivity: "base" });
    });
    for (const c of n.children) {
      sortChildren(c);
    }
  };
  sortChildren(root);
  return root.children;
}

/** Keys along the branch (including leaf `pathKey`) so `targetDbPath` becomes visible when those nodes are expanded. */
export function pathKeysBranchingToTarget<T extends { path: string }>(
  nodes: PathTreeNode<T>[],
  targetDbPath: string | undefined,
): Set<string> {
  const keys = new Set<string>();
  if (!targetDbPath) return keys;

  const dfs = (arr: PathTreeNode<T>[], ancestors: string[]): boolean => {
    for (const n of arr) {
      const chain = [...ancestors, n.pathKey];
      if (n.page?.path === targetDbPath) {
        chain.forEach((k) => keys.add(k));
        return true;
      }
      if (n.children.length > 0 && dfs(n.children, chain)) {
        chain.forEach((k) => keys.add(k));
        return true;
      }
    }
    return false;
  };

  dfs(nodes, []);
  return keys;
}

/** Every node `pathKey` that has children (for default-expanded admin tree). */
export function pathKeysWithChildren<T extends { path: string }>(nodes: PathTreeNode<T>[]): Set<string> {
  const keys = new Set<string>();
  const walk = (arr: PathTreeNode<T>[]) => {
    for (const n of arr) {
      if (n.children.length > 0) {
        keys.add(n.pathKey);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}
