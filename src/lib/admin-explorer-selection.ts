import type { AdminPageRow } from "@/types/admin-workbench";
import type { PathTreeNode } from "@/lib/page-tree";

export function explorerSelectionKey(lang: string, pageId: string): string {
  return `${lang}:${pageId}`;
}

export function parseExplorerSelectionKey(key: string): { lang: string; pageId: string } | null {
  const sep = key.indexOf(":");
  if (sep < 0) return null;
  return { lang: key.slice(0, sep), pageId: key.slice(sep + 1) };
}

/** Visible pages in tree order (expanded branches only). */
export function collectVisibleTreePages(
  nodes: PathTreeNode<AdminPageRow>[],
  openBranches: Set<string>,
): AdminPageRow[] {
  const out: AdminPageRow[] = [];

  const walk = (list: PathTreeNode<AdminPageRow>[]) => {
    for (const node of list) {
      if (node.page) out.push(node.page);
      const hasChildren = node.children.length > 0;
      const isCategory = node.page?.isCategory === true;
      const expandable = hasChildren || isCategory;
      const expanded = !expandable || openBranches.has(node.pathKey);
      if (expanded && hasChildren) walk(node.children);
    }
  };

  walk(nodes);
  return out;
}

export function selectRangeKeys(
  visiblePages: AdminPageRow[],
  anchorKey: string,
  targetKey: string,
): Set<string> {
  const keys = visiblePages.map((p) => explorerSelectionKey(p.lang, p.id));
  const a = keys.indexOf(anchorKey);
  const b = keys.indexOf(targetKey);
  if (a < 0 || b < 0) return new Set([targetKey]);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return new Set(keys.slice(lo, hi + 1));
}

export function resolveSelectedPages(
  selected: Set<string>,
  pagesByLang: Record<string, AdminPageRow[]>,
): AdminPageRow[] {
  const rows: AdminPageRow[] = [];
  for (const key of selected) {
    const parsed = parseExplorerSelectionKey(key);
    if (!parsed) continue;
    const page = (pagesByLang[parsed.lang] ?? []).find((p) => p.id === parsed.pageId);
    if (page) rows.push(page);
  }
  return rows;
}

export function expandablePathKeysForPages(pages: AdminPageRow[], allInLang: AdminPageRow[]): Set<string> {
  const keys = new Set<string>();
  for (const page of pages) {
    const hasKids = allInLang.some((p) => p.path !== page.path && p.path.startsWith(`${page.path}/`));
    if (hasKids || page.isCategory) keys.add(page.path);
  }
  return keys;
}
