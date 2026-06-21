import { isMoveIntoDescendant, nextPagePath } from "@/lib/page-move";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

/** Minimal row for reorder (admin pages + home draft). */
export type ReorderPageRow = {
  id: string;
  path: string;
  navOrder: number;
  isCategory?: boolean;
};

export type ReorderPatch = {
  id: string;
  navOrder: number;
  parentPathParts?: string[];
};

export type PageMetadataPatch = {
  title?: string;
  excerpt?: string | null;
  icon?: string | null;
  navOrder?: number;
  parentPathParts?: string[];
};

export type ReorderError = { error: "NOT_FOUND" | "INTO_DESCENDANT" };

export type DropTarget =
  | { kind: "root" }
  | { kind: "folder"; pathKey: string }
  | { kind: "page"; targetId: string; mode: "before" | "after" | "inside" };

export type PatchableRow = {
  id: string;
  pathKey: string;
  title: string;
  icon: string | null;
  navOrder: number;
  parentPathKey: string;
};

/** Parent path segments: segs.slice(0, -1) or [] for root. */
export function getParentPathParts(path: string, lang: string): string[] {
  const segs = pathSegmentsAfterLang(path, lang);
  return segs.length <= 1 ? [] : segs.slice(0, -1);
}

/** Map key: `/${lang}` or `/${lang}/wallet`. */
export function parentPathKeyFromParts(lang: string, parts: string[]): string {
  if (parts.length === 0) return `/${lang}`;
  return `/${lang}/${parts.join("/")}`;
}

/** Parent segments from pathKey (wiki URL prefix, not DB path). */
export function parentPathPartsFromPathKey(pathKey: string, lang: string): string[] {
  const prefix = `/${lang}`;
  if (pathKey === prefix) return [];
  if (!pathKey.startsWith(`${prefix}/`)) return [];
  const tail = pathKey.slice(prefix.length + 1);
  const segs = tail.split("/").filter(Boolean);
  return segs.length <= 1 ? [] : segs.slice(0, -1);
}

export function resolveMoveTarget(
  lang: string,
  pages: ReorderPageRow[],
  target: DropTarget,
): { newParentParts: string[]; targetPageId: string | null; mode: "before" | "after" | "inside" } {
  if (target.kind === "root") {
    return { newParentParts: [], targetPageId: null, mode: "after" };
  }

  if (target.kind === "folder") {
    return {
      newParentParts: pathSegmentsAfterLang(target.pathKey, lang),
      targetPageId: null,
      mode: "inside",
    };
  }

  const targetPage = pages.find((p) => p.id === target.targetId);
  if (!targetPage) {
    return { newParentParts: [], targetPageId: null, mode: "after" };
  }

  const targetParent = getParentPathParts(targetPage.path, lang);
  const targetInside = pathSegmentsAfterLang(targetPage.path, lang);
  const newParentParts = target.mode === "inside" ? targetInside : targetParent;
  return { newParentParts, targetPageId: target.targetId, mode: target.mode };
}

export function calculateSiblingOrders(
  lang: string,
  pages: ReorderPageRow[],
  fromId: string,
  newParentParts: string[],
  targetPageId: string | null,
  mode: "before" | "after" | "inside",
): ReorderPatch[] | ReorderError {
  const from = pages.find((p) => p.id === fromId);
  if (!from) return { error: "NOT_FOUND" };

  const fromSlug = pathSegmentsAfterLang(from.path, lang).slice(-1)[0] ?? "";
  const targetPath = nextPagePath(lang, newParentParts, fromSlug);
  const currentParentKey = getParentPathParts(from.path, lang).join("/");
  const newParentKey = newParentParts.join("/");
  if (currentParentKey !== newParentKey && isMoveIntoDescendant(from.path, targetPath)) {
    return { error: "INTO_DESCENDANT" };
  }

  const siblingKey = newParentParts.join("/");
  const siblingIds = pages
    .filter((p) => getParentPathParts(p.path, lang).join("/") === siblingKey)
    .map((p) => p.id);

  let insertAt = siblingIds.length;
  if (targetPageId && mode !== "inside") {
    const targetIndex = siblingIds.indexOf(targetPageId);
    if (targetIndex >= 0) insertAt = mode === "before" ? targetIndex : targetIndex + 1;
  }

  const ordered = siblingIds.filter((id) => id !== fromId);
  ordered.splice(insertAt, 0, fromId);

  return ordered.map((id, i) => {
    const patch: ReorderPatch = { id, navOrder: i * 10 };
    if (id === fromId) patch.parentPathParts = newParentParts;
    return patch;
  });
}

export function buildPatchPayloads(
  baseline: Map<string, PatchableRow>,
  draft: Map<string, PatchableRow>,
  lang: string,
): { id: string; payload: PageMetadataPatch }[] {
  const patches: { id: string; payload: PageMetadataPatch }[] = [];

  for (const [pathKey, draftNode] of draft) {
    if (!draftNode.id) continue;
    const baseNode = baseline.get(pathKey);
    if (!baseNode) continue;

    const payload: PageMetadataPatch = {};
    if (draftNode.title !== baseNode.title) payload.title = draftNode.title;
    if (draftNode.icon !== baseNode.icon) payload.icon = draftNode.icon;
    if (draftNode.navOrder !== baseNode.navOrder) payload.navOrder = draftNode.navOrder;
    if (draftNode.parentPathKey !== baseNode.parentPathKey) {
      payload.parentPathParts = parentPathPartsFromPathKey(draftNode.pathKey, lang);
    }

    if (Object.keys(payload).length > 0) {
      patches.push({ id: draftNode.id, payload });
    }
  }

  return patches;
}

export function isReorderError(result: ReorderPatch[] | ReorderError): result is ReorderError {
  return "error" in result;
}
