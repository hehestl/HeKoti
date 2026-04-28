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
