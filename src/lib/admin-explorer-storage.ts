import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import { buildPathTree, pathKeysWithChildren } from "@/lib/page-tree";

export const EXPLORER_LANGS_KEY = "admin-explorer-langs";
export const EXPLORER_BRANCHES_KEY = "admin-explorer-branches";

export function buildDefaultOpenBranches(enabled: string[], pagesByLang: AdminPagesByLang): Record<string, Set<string>> {
  const initial: Record<string, Set<string>> = {};
  for (const lang of enabled) {
    const pages = pagesByLang[lang] ?? [];
    const tree = buildPathTree(pages, lang);
    initial[lang] = pathKeysWithChildren(tree);
  }
  return initial;
}

export function loadExpandedLangs(enabled: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(EXPLORER_LANGS_KEY);
    if (!raw) return new Set(enabled);
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : enabled);
  } catch {
    return new Set(enabled);
  }
}

export function loadOpenBranches(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(EXPLORER_BRANCHES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function persistOpenBranches(state: Record<string, Set<string>>) {
  const serializable = Object.fromEntries(Object.entries(state).map(([k, v]) => [k, [...v]]));
  localStorage.setItem(EXPLORER_BRANCHES_KEY, JSON.stringify(serializable));
}

export function persistExpandedLangs(langs: Set<string>) {
  localStorage.setItem(EXPLORER_LANGS_KEY, JSON.stringify([...langs]));
}
