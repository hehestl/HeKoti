"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { PathTreeNode } from "@/lib/page-tree";
import type { DropTarget } from "@/lib/page-reorder";
import {
  calculateSiblingOrders,
  isReorderError,
  resolveMoveTarget,
} from "@/lib/page-reorder";
import {
  applyReorderPatchesToDraft,
  buildHomePatchPayloads,
  categoryMapsEqual,
  cloneCategoryMap,
  draftToReorderRows,
  implicitCreatesFromDraft,
  parentPathPartsForCategory,
  treeSignature,
  treeToCategoryMaps,
  getReorderableSiblings,
  moveSiblingInDraft,
  type EditableHomeCategory,
  type HomeInlineEditLabels,
  type HomeTreePage,
} from "@/components/home-inline-edit-types";

type HomeInlineEditContextValue = {
  canEdit: boolean;
  isEditing: boolean;
  isAdmin: boolean;
  lang: string;
  draft: Map<string, EditableHomeCategory> | null;
  baseline: Map<string, EditableHomeCategory> | null;
  tree: PathTreeNode<HomeTreePage>[];
  statusText: string;
  statusTone: "neutral" | "error";
  labels: HomeInlineEditLabels;
  registerTree: (lang: string, tree: PathTreeNode<HomeTreePage>[], searchMode: boolean) => void;
  unregisterTree: () => void;
  startEdit: () => void;
  cancelEdit: () => void;
  saveNow: () => Promise<boolean>;
  patchDraft: (pathKey: string, patch: Partial<EditableHomeCategory>) => void;
  reorderDraft: (fromId: string, target: DropTarget) => boolean;
  moveSiblingDraft: (pathKey: string, direction: "up" | "down") => boolean;
  promoteToCategory: (pathKey: string) => void;
  isDirty: boolean;
};

const HomeInlineEditContext = createContext<HomeInlineEditContextValue | null>(null);

export function HomeInlineEditProvider({
  isAdmin,
  labels,
  children,
}: {
  isAdmin: boolean;
  labels: HomeInlineEditLabels;
  children: ReactNode;
}) {
  const router = useRouter();
  const [lang, setLang] = useState("");
  const [registered, setRegistered] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [baseline, setBaseline] = useState<Map<string, EditableHomeCategory> | null>(null);
  const [draft, setDraft] = useState<Map<string, EditableHomeCategory> | null>(null);
  const [tree, setTree] = useState<PathTreeNode<HomeTreePage>[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const lastSignatureRef = useRef("");
  const baselineRef = useRef<Map<string, EditableHomeCategory> | null>(null);
  baselineRef.current = baseline;
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  const setStatus = useCallback((text: string, tone: "neutral" | "error" = "neutral") => {
    setStatusText(text);
    setStatusTone(tone);
  }, []);

  const registerTree = useCallback(
    (nextLang: string, nextTree: PathTreeNode<HomeTreePage>[], nextSearchMode: boolean) => {
      setLang(nextLang);
      setSearchMode(nextSearchMode);
      setRegistered(!nextSearchMode);
      setTree(nextTree);

      // В режиме редактирования draft — источник правды; refresh после save не должен затирать baseline.
      if (isEditingRef.current) return;

      const nextBaseline = treeToCategoryMaps(nextTree, nextLang);
      const sig = treeSignature(nextBaseline);
      if (sig === lastSignatureRef.current && baselineRef.current) return;
      lastSignatureRef.current = sig;

      setBaseline(nextBaseline);
      setDraft(null);
    },
    [],
  );

  const unregisterTree = useCallback(() => {
    setRegistered(false);
    setSearchMode(false);
    lastSignatureRef.current = "";
    if (!isEditingRef.current) {
      setBaseline(null);
      setDraft(null);
      setTree([]);
    }
  }, []);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return !categoryMapsEqual(draft, baseline);
  }, [baseline, draft]);

  const startEdit = useCallback(() => {
    if (!isAdmin || !baseline || searchMode) return;
    setDraft(cloneCategoryMap(baseline));
    setIsEditing(true);
    isEditingRef.current = true;
    setStatusText("");
    setStatusTone("neutral");
  }, [baseline, isAdmin, searchMode, setStatus]);

  const cancelEdit = useCallback(() => {
    if (isDirty && !window.confirm(labels.dirtyConfirm)) return;
    isEditingRef.current = false;
    setIsEditing(false);
    setDraft(null);
    setStatusText("");
    setStatusTone("neutral");
    router.refresh();
  }, [isDirty, labels.dirtyConfirm, router]);

  const patchDraft = useCallback((pathKey: string, patch: Partial<EditableHomeCategory>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const node = prev.get(pathKey);
      if (!node) return prev;
      const next = cloneCategoryMap(prev);
      next.set(pathKey, { ...node, ...patch });
      return next;
    });
  }, []);

  const reorderDraft = useCallback(
    (fromId: string, target: DropTarget): boolean => {
      if (!draft || !lang) return false;
      const pages = draftToReorderRows(draft);
      const { newParentParts, targetPageId, mode } = resolveMoveTarget(lang, pages, target);
      const result = calculateSiblingOrders(lang, pages, fromId, newParentParts, targetPageId, mode);
      if (isReorderError(result)) {
        setStatus(labels.moveBlocked, "error");
        return false;
      }
      setDraft(applyReorderPatchesToDraft(lang, draft, result));
      setStatusText("");
      setStatusTone("neutral");
      return true;
    },
    [draft, labels.moveBlocked, lang, setStatus],
  );

  const moveSiblingDraft = useCallback(
    (pathKey: string, direction: "up" | "down"): boolean => {
      if (!draft) return false;
      const next = moveSiblingInDraft(draft, pathKey, direction);
      if (!next) return false;
      setDraft(next);
      setStatusText("");
      setStatusTone("neutral");
      return true;
    },
    [draft],
  );

  const promoteToCategory = useCallback((pathKey: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const node = prev.get(pathKey);
      if (!node || !node.isImplicit || node.id) return prev;
      const next = cloneCategoryMap(prev);
      next.set(pathKey, { ...node, pendingCreate: true, isCategory: true, canEdit: true });
      return next;
    });
  }, []);

  const saveNow = useCallback(async () => {
    if (!draft || !baseline || !lang) return false;
    const draftSnapshot = cloneCategoryMap(draft);
    const baselineSnapshot = cloneCategoryMap(baseline);
    setStatus(labels.saving);

    try {
      let workingDraft = draftSnapshot;

      for (const cat of implicitCreatesFromDraft(workingDraft)) {
        const res = await apiFetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang,
            title: cat.title,
            slug: cat.segment,
            parentPathParts: parentPathPartsForCategory(cat, lang),
            isCategory: true,
            isPublished: true,
            icon: cat.icon,
            excerpt: cat.excerpt.trim() || null,
            contentMd: "",
          }),
        });
        const created = (await res.json()) as { id?: string; message?: string };
        if (!res.ok || !created.id) {
          setDraft(baselineSnapshot);
          setStatus(created.message ?? labels.failed, "error");
          return false;
        }
        const next = cloneCategoryMap(workingDraft);
        const node = next.get(cat.pathKey);
        if (node) {
          next.set(cat.pathKey, {
            ...node,
            id: created.id,
            pendingCreate: false,
            isImplicit: false,
          });
        }
        workingDraft = next;
      }

      const patches = buildHomePatchPayloads(baselineSnapshot, workingDraft, lang);
      const results = await Promise.allSettled(
        patches.map(async ({ id, payload }) => {
          const res = await apiFetch(`/api/pages/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const data = (await res.json()) as { message?: string };
            throw new Error(data.message ?? labels.failed);
          }
        }),
      );

      if (results.some((r) => r.status === "rejected")) {
        setDraft(baselineSnapshot);
        setStatus(labels.failed, "error");
        return false;
      }

      setDraft(workingDraft);
      setBaseline(workingDraft);
      lastSignatureRef.current = treeSignature(workingDraft);
      setStatus(labels.saved);
      router.refresh();
      return true;
    } catch {
      setDraft(baselineSnapshot);
      setStatus(labels.failed, "error");
      return false;
    }
  }, [baseline, draft, labels.failed, labels.saved, labels.saving, lang, router, setStatus]);

  const value = useMemo(
    (): HomeInlineEditContextValue => ({
      canEdit: isAdmin && registered && !searchMode && !!baseline,
      isEditing,
      isAdmin,
      lang,
      draft,
      baseline,
      tree,
      statusText,
      statusTone,
      labels,
      registerTree,
      unregisterTree,
      startEdit,
      cancelEdit,
      saveNow,
      patchDraft,
      reorderDraft,
      moveSiblingDraft,
      promoteToCategory,
      isDirty,
    }),
    [
      baseline,
      cancelEdit,
      draft,
      isAdmin,
      isDirty,
      isEditing,
      labels,
      lang,
      patchDraft,
      moveSiblingDraft,
      promoteToCategory,
      registered,
      reorderDraft,
      registerTree,
      saveNow,
      searchMode,
      startEdit,
      statusText,
      statusTone,
      tree,
      unregisterTree,
    ],
  );

  return <HomeInlineEditContext.Provider value={value}>{children}</HomeInlineEditContext.Provider>;
}

export function useHomeInlineEdit() {
  const ctx = useContext(HomeInlineEditContext);
  if (!ctx) throw new Error("useHomeInlineEdit must be used within HomeInlineEditProvider");
  return ctx;
}

export function useHomeInlineEditOptional() {
  return useContext(HomeInlineEditContext);
}
