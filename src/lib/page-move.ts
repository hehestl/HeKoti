import { normalizePath, validateSlugInput } from "@/lib/slug";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export function nextPagePath(lang: string, parentPathParts: string[], slug: string): string {
  return normalizePath(lang, [...parentPathParts, slug]);
}

/** True if newPath is the same as or nested under oldPath (invalid reparent). */
export function isMoveIntoDescendant(oldPath: string, newPath: string): boolean {
  return newPath === oldPath || newPath.startsWith(`${oldPath}/`);
}

export function remapDescendantPath(oldRootPath: string, newRootPath: string, descendantPath: string): string {
  if (!descendantPath.startsWith(`${oldRootPath}/`)) {
    throw new Error("Not a descendant path.");
  }
  return `${newRootPath}${descendantPath.slice(oldRootPath.length)}`;
}

export type PagePathRow = { id: string; path: string };

/** Plans path updates for a page and its active descendants. */
export function planPageBranchMove(
  root: PagePathRow,
  parentPathParts: string[],
  lang: string,
  slug: string,
  descendants: PagePathRow[],
): { oldPath: string; newPath: string; updates: PagePathRow[] } {
  const oldPath = root.path;
  const newPath = nextPagePath(lang, parentPathParts, slug);

  if (newPath === oldPath) {
    return { oldPath, newPath, updates: [{ id: root.id, path: newPath }] };
  }

  if (isMoveIntoDescendant(oldPath, newPath)) {
    throw new Error("MOVE_INTO_DESCENDANT");
  }

  const updates: PagePathRow[] = [{ id: root.id, path: newPath }];
  for (const child of descendants) {
    updates.push({
      id: child.id,
      path: remapDescendantPath(oldPath, newPath, child.path),
    });
  }

  const targetPaths = updates.map((u) => u.path);
  const duplicateTarget = targetPaths.length !== new Set(targetPaths).size;
  if (duplicateTarget) {
    throw new Error("MOVE_PATH_COLLISION");
  }

  return { oldPath, newPath, updates };
}

export type SlugRenamePathUpdate = { id: string; path: string; slug?: string };

export type SlugRenamePlan = {
  pathUpdates: SlugRenamePathUpdate[];
  redirectPairs: { lang: string; oldPath: string; newPath: string }[];
};

export function collectSiblingSlugs(
  pages: { id: string; slug: string; path: string }[],
  pageId: string,
  parentParts: string[],
  lang: string,
): string[] {
  const parentKey = parentParts.join("/");
  return pages
    .filter((p) => {
      if (p.id === pageId) return false;
      const segs = pathSegmentsAfterLang(p.path, lang);
      return segs.slice(0, -1).join("/") === parentKey;
    })
    .map((p) => p.slug);
}

export function planPageSlugRename(
  page: { id: string; path: string; slug: string; lang: string },
  newSlugInput: string,
  descendants: PagePathRow[],
  siblingSlugs: string[],
): SlugRenamePlan {
  const newSlug = validateSlugInput(newSlugInput);
  if (!newSlug) throw new Error("SLUG_INVALID");
  if (page.slug === newSlug) {
    return { pathUpdates: [], redirectPairs: [] };
  }
  if (siblingSlugs.includes(newSlug)) throw new Error("SLUG_COLLISION");

  const parentParts = pathSegmentsAfterLang(page.path, page.lang).slice(0, -1);
  const plan = planPageBranchMove(
    { id: page.id, path: page.path },
    parentParts,
    page.lang,
    newSlug,
    descendants,
  );

  const oldPathById = new Map<string, string>([
    [page.id, page.path],
    ...descendants.map((d) => [d.id, d.path] as const),
  ]);

  const pathUpdates: SlugRenamePathUpdate[] = plan.updates.map((u) => ({
    id: u.id,
    path: u.path,
    ...(u.id === page.id ? { slug: newSlug } : {}),
  }));

  const redirectPairs = plan.updates
    .map((u) => ({
      lang: page.lang,
      oldPath: oldPathById.get(u.id) ?? u.path,
      newPath: u.path,
    }))
    .filter((r) => r.oldPath !== r.newPath);

  return { pathUpdates, redirectPairs };
}