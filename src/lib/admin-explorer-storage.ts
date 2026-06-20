import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import { buildPathTree, collectPathKeys, pathKeysWithChildren } from "@/lib/page-tree";

export type ExplorerStorageVariant = "posts" | "notes";

/** @deprecated Legacy shared key — migrated on read */
const LEGACY_EXPLORER_LANGS_KEY = "admin-explorer-langs";
/** @deprecated Legacy shared key — migrated on read */
const LEGACY_EXPLORER_BRANCHES_KEY = "admin-explorer-branches";

export function explorerLangsKey(variant: ExplorerStorageVariant): string {
  return `admin-explorer-langs-${variant}`;
}

export function explorerBranchesKey(variant: ExplorerStorageVariant): string {
  return `admin-explorer-branches-${variant}`;
}

export function buildDefaultOpenBranches(enabled: string[], pagesByLang: AdminPagesByLang): Record<string, Set<string>> {
  const initial: Record<string, Set<string>> = {};
  for (const lang of enabled) {
    const pages = pagesByLang[lang] ?? [];
    const tree = buildPathTree(pages, lang);
    initial[lang] = pathKeysWithChildren(tree);
  }
  return initial;
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readStoredLangs(variant: ExplorerStorageVariant): string[] | null {
  const scoped = readJson(explorerLangsKey(variant));
  if (Array.isArray(scoped)) return scoped as string[];
  const legacy = readJson(LEGACY_EXPLORER_LANGS_KEY);
  if (Array.isArray(legacy)) return legacy as string[];
  return null;
}

function readStoredBranches(variant: ExplorerStorageVariant): Record<string, string[]> {
  const scoped = readJson(explorerBranchesKey(variant));
  if (scoped && typeof scoped === "object" && !Array.isArray(scoped)) {
    return scoped as Record<string, string[]>;
  }
  const legacy = readJson(LEGACY_EXPLORER_BRANCHES_KEY);
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    return legacy as Record<string, string[]>;
  }
  return {};
}

export function loadExpandedLangs(enabled: string[], variant: ExplorerStorageVariant = "posts"): Set<string> {
  if (typeof window === "undefined") return new Set(enabled);
  const parsed = readStoredLangs(variant);
  return new Set(Array.isArray(parsed) ? parsed.filter((l) => enabled.includes(l)) : enabled);
}

export function loadOpenBranches(variant: ExplorerStorageVariant = "posts"): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  return readStoredBranches(variant);
}

/** Hydrate open branches from localStorage; invalid path keys are dropped. */
export function loadOpenBranchesState(
  enabled: string[],
  pagesByLang: AdminPagesByLang,
  variant: ExplorerStorageVariant = "posts",
  storedOverride?: Record<string, string[]>,
): Record<string, Set<string>> {
  const stored = storedOverride ?? loadOpenBranches(variant);
  const next: Record<string, Set<string>> = {};
  for (const lang of enabled) {
    const pages = pagesByLang[lang] ?? [];
    const tree = buildPathTree(pages, lang);
    const valid = collectPathKeys(tree);
    const defaultOpen = pathKeysWithChildren(tree);
    const saved = stored[lang];
    if (Object.prototype.hasOwnProperty.call(stored, lang)) {
      next[lang] = new Set((saved ?? []).filter((k) => valid.has(k)));
    } else {
      next[lang] = new Set(defaultOpen);
    }
  }
  return next;
}

export function persistOpenBranches(state: Record<string, Set<string>>, variant: ExplorerStorageVariant = "posts") {
  if (typeof window === "undefined") return;
  const serializable = Object.fromEntries(Object.entries(state).map(([k, v]) => [k, [...v]]));
  localStorage.setItem(explorerBranchesKey(variant), JSON.stringify(serializable));
}

export function persistExpandedLangs(langs: Set<string>, variant: ExplorerStorageVariant = "posts") {
  if (typeof window === "undefined") return;
  localStorage.setItem(explorerLangsKey(variant), JSON.stringify([...langs]));
}
