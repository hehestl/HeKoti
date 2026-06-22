import type { PathTreeNode } from "@/lib/page-tree";
import type { PageMetadataPatch, ReorderPatch, DropTarget } from "@/lib/page-reorder";
import {
  parentPathKeyFromParts,
  parentPathPartsFromPathKey,
} from "@/lib/page-reorder";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

/** Minimal page row for home tree (avoids importing wiki-collection in client bundle). */
export type HomeTreePage = {
  id: string;
  path: string;
  title: string;
  navOrder?: number;
  excerpt?: string | null;
  icon?: string | null;
  isCategory?: boolean;
  systemKey?: string | null;
};

function humanizeSegment(segment: string): string {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type HomeInlineEditLabels = {
  dragHint: string;
  makeCategory: string;
  implicitHint: string;
  leafReadOnly: string;
  systemReadOnly: string;
  save: string;
  cancel: string;
  saved: string;
  saving: string;
  failed: string;
  dirtyConfirm: string;
  mascotEdit: string;
  mascotExitEdit: string;
  clearIcon: string;
  moveUp: string;
  moveDown: string;
  changeIcon: string;
  dropReorder: string;
  dropNest: string;
  dropRoot: string;
  moveBlocked: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
};

export type EditableHomeCategory = {
  pathKey: string;
  id?: string;
  title: string;
  excerpt: string;
  icon: string | null;
  navOrder: number;
  parentPathKey: string;
  isCategory: boolean;
  hasChildren: boolean;
  canEdit: boolean;
  isSystem: boolean;
  isImplicit: boolean;
  segment: string;
  systemKey: string | null;
  pendingCreate?: boolean;
};

export function parentPathKeyForPathKey(pathKey: string, lang: string): string {
  const parts = pathSegmentsAfterLang(pathKey, lang);
  if (parts.length <= 1) return `/${lang}`;
  return parentPathKeyFromParts(lang, parts.slice(0, -1));
}

export function treeToCategoryMaps(
  nodes: PathTreeNode<HomeTreePage>[],
  lang: string,
): Map<string, EditableHomeCategory> {
  const map = new Map<string, EditableHomeCategory>();
  const rootKey = `/${lang}`;

  const walk = (list: PathTreeNode<HomeTreePage>[], parentPathKey: string) => {
    for (const node of list) {
      const hasChildren = node.children.length > 0;
      const page = node.page;
      const systemKey = page?.systemKey ?? null;
      const isSystem = !!systemKey;
      const isImplicit = !page?.id && hasChildren;
      const isCategory = page?.isCategory === true || (isImplicit && hasChildren);
      const canEdit = !isSystem && (isCategory || hasChildren);

      map.set(node.pathKey, {
        pathKey: node.pathKey,
        id: page?.id,
        title: page?.title ?? humanizeSegment(node.segment),
        excerpt: page?.excerpt?.trim() ?? "",
        icon: page?.icon ?? null,
        navOrder: page?.navOrder ?? 0,
        isCategory,
        hasChildren,
        canEdit,
        isSystem,
        isImplicit,
        segment: node.segment,
        parentPathKey,
        systemKey,
      });
      walk(node.children, node.pathKey);
    }
  };

  walk(nodes, rootKey);
  return map;
}

export function treeSignature(map: Map<string, EditableHomeCategory>): string {
  return [...map.keys()].sort().join("\0");
}

export function cloneCategoryMap(source: Map<string, EditableHomeCategory>): Map<string, EditableHomeCategory> {
  return new Map([...source.entries()].map(([k, v]) => [k, { ...v }]));
}

export function categoryMapsEqual(
  a: Map<string, EditableHomeCategory>,
  b: Map<string, EditableHomeCategory>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, left] of a) {
    const right = b.get(key);
    if (!right) return false;
    if (
      left.id !== right.id ||
      left.title !== right.title ||
      left.excerpt !== right.excerpt ||
      left.icon !== right.icon ||
      left.navOrder !== right.navOrder ||
      left.parentPathKey !== right.parentPathKey ||
      left.pendingCreate !== right.pendingCreate
    ) {
      return false;
    }
  }
  return true;
}

export function draftToReorderRows(draft: Map<string, EditableHomeCategory>): import("@/lib/page-reorder").ReorderPageRow[] {
  const rows: import("@/lib/page-reorder").ReorderPageRow[] = [];
  for (const cat of draft.values()) {
    if (!cat.id) continue;
    rows.push({
      id: cat.id,
      path: cat.pathKey,
      navOrder: cat.navOrder,
      isCategory: cat.isCategory,
    });
  }
  return rows;
}

export function applyReorderPatchesToDraft(
  lang: string,
  draft: Map<string, EditableHomeCategory>,
  patches: ReorderPatch[],
): Map<string, EditableHomeCategory> {
  let next = cloneCategoryMap(draft);
  const idToPathKey = new Map<string, string>();
  for (const [k, v] of next) {
    if (v.id) idToPathKey.set(v.id, k);
  }

  for (const patch of patches) {
    if (patch.parentPathParts === undefined) continue;
    const oldKey = idToPathKey.get(patch.id);
    if (!oldKey) continue;
    const node = next.get(oldKey);
    if (!node) continue;

    const newParentKey = parentPathKeyFromParts(lang, patch.parentPathParts);
    const newKey = `${newParentKey}/${node.segment}`;
    if (newKey === oldKey) continue;

    const renames: { oldK: string; newK: string }[] = [];
    for (const k of next.keys()) {
      if (k === oldKey || k.startsWith(`${oldKey}/`)) {
        const suffix = k.slice(oldKey.length);
        renames.push({ oldK: k, newK: `${newKey}${suffix}` });
      }
    }
    renames.sort((a, b) => b.oldK.length - a.oldK.length);

    for (const { oldK, newK } of renames) {
      const entry = next.get(oldK);
      if (!entry) continue;
      next.delete(oldK);
      const updated: EditableHomeCategory = {
        ...entry,
        pathKey: newK,
        parentPathKey: parentPathKeyForPathKey(newK, lang),
        navOrder: entry.id === patch.id ? patch.navOrder : entry.navOrder,
      };
      next.set(newK, updated);
      if (entry.id) idToPathKey.set(entry.id, newK);
    }
  }

  for (const patch of patches) {
    const key = idToPathKey.get(patch.id);
    if (!key) continue;
    const node = next.get(key);
    if (!node) continue;
    next.set(key, {
      ...node,
      navOrder: patch.navOrder,
      ...(patch.parentPathParts !== undefined
        ? { parentPathKey: parentPathKeyFromParts(lang, patch.parentPathParts) }
        : {}),
    });
  }

  return next;
}

export function buildTreeFromCategoryDraft(
  draft: Map<string, EditableHomeCategory>,
  lang: string,
): PathTreeNode<HomeTreePage>[] {
  const rootKey = `/${lang}`;
  const byParent = new Map<string, EditableHomeCategory[]>();

  for (const cat of draft.values()) {
    const list = byParent.get(cat.parentPathKey) ?? [];
    list.push(cat);
    byParent.set(cat.parentPathKey, list);
  }

  const buildLevel = (parentKey: string): PathTreeNode<HomeTreePage>[] => {
    const items = (byParent.get(parentKey) ?? []).slice().sort((a, b) => {
      if (a.navOrder !== b.navOrder) return a.navOrder - b.navOrder;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });

    return items.map((cat) => {
      const page: HomeTreePage | null = cat.id
        ? {
            id: cat.id,
            path: cat.pathKey,
            title: cat.title,
            navOrder: cat.navOrder,
            excerpt: cat.excerpt || null,
            icon: cat.icon,
            isCategory: cat.isCategory,
            systemKey: cat.systemKey,
          }
        : null;

      return {
        pathKey: cat.pathKey,
        segment: cat.segment,
        page,
        children: buildLevel(cat.pathKey),
      };
    });
  };

  return buildLevel(rootKey);
}

export function implicitCreatesFromDraft(draft: Map<string, EditableHomeCategory>): EditableHomeCategory[] {
  return [...draft.values()].filter((c) => c.pendingCreate && !c.id && c.isImplicit);
}

export function buildHomePatchPayloads(
  baseline: Map<string, EditableHomeCategory>,
  draft: Map<string, EditableHomeCategory>,
  lang: string,
): { id: string; payload: PageMetadataPatch }[] {
  const baselineById = new Map<string, EditableHomeCategory>();
  for (const cat of baseline.values()) {
    if (cat.id) baselineById.set(cat.id, cat);
  }

  const patches: { id: string; payload: PageMetadataPatch }[] = [];
  for (const draftNode of draft.values()) {
    if (!draftNode.id) continue;
    const baseNode = baselineById.get(draftNode.id);
    if (!baseNode) continue;

    const payload: PageMetadataPatch = {};
    if (draftNode.title !== baseNode.title) payload.title = draftNode.title;
    const draftExcerpt = draftNode.excerpt.trim();
    const baseExcerpt = baseNode.excerpt.trim();
    if (draftExcerpt !== baseExcerpt) payload.excerpt = draftExcerpt || null;
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

export function parentPathPartsForCategory(cat: EditableHomeCategory, lang: string): string[] {
  return parentPathPartsFromPathKey(cat.parentPathKey, lang);
}

function isReorderableHomeRow(cat: EditableHomeCategory): boolean {
  return !!cat.id && cat.canEdit && (cat.isCategory || cat.hasChildren);
}

export function getReorderableSiblings(
  draft: Map<string, EditableHomeCategory>,
  parentPathKey: string,
): EditableHomeCategory[] {
  return [...draft.values()]
    .filter((c) => c.parentPathKey === parentPathKey && isReorderableHomeRow(c))
    .sort((a, b) => {
      if (a.navOrder !== b.navOrder) return a.navOrder - b.navOrder;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
}

/** Swap with adjacent reorderable sibling and reassign navOrder (home ↑↓ buttons). */
export function moveSiblingInDraft(
  draft: Map<string, EditableHomeCategory>,
  pathKey: string,
  direction: "up" | "down",
): Map<string, EditableHomeCategory> | null {
  const node = draft.get(pathKey);
  if (!node || !isReorderableHomeRow(node)) return null;

  const siblings = getReorderableSiblings(draft, node.parentPathKey);
  const idx = siblings.findIndex((s) => s.pathKey === pathKey);
  if (idx < 0) return null;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return null;

  const reordered = siblings.slice();
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx]!, reordered[idx]!];

  const next = cloneCategoryMap(draft);
  for (let i = 0; i < reordered.length; i++) {
    const s = reordered[i]!;
    const current = next.get(s.pathKey)!;
    next.set(s.pathKey, { ...current, navOrder: i * 10 });
  }
  return next;
}

export function canMoveSibling(
  draft: Map<string, EditableHomeCategory>,
  pathKey: string,
  direction: "up" | "down",
): boolean {
  const node = draft.get(pathKey);
  if (!node || !isReorderableHomeRow(node)) return false;

  const siblings = getReorderableSiblings(draft, node.parentPathKey);
  const idx = siblings.findIndex((s) => s.pathKey === pathKey);
  if (idx < 0) return false;
  return direction === "up" ? idx > 0 : idx < siblings.length - 1;
}
