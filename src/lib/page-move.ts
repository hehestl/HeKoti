import { normalizePath } from "@/lib/slug";

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