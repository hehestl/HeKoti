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
import type {
  EditableWikiPage,
  WikiInlineEditLabels,
  WikiPageBrief,
} from "@/components/wiki-inline-edit-types";
import { pageDraftEquals, useWikiInlineSave } from "@/hooks/use-wiki-inline-save";

type WikiInlineEditContextValue = {
  canEdit: boolean;
  isEditing: boolean;
  isAdmin: boolean;
  editablePage: EditableWikiPage | null;
  draft: EditableWikiPage | null;
  baseline: EditableWikiPage | null;
  statusText: string;
  statusTone: "neutral" | "error";
  wikiPages: WikiPageBrief[];
  labels: WikiInlineEditLabels;
  registerPage: (page: EditableWikiPage) => void;
  unregisterPage: () => void;
  startEdit: () => void;
  cancelEdit: () => void;
  saveNow: (opts?: { silent?: boolean }) => Promise<boolean>;
  togglePublish: () => Promise<void>;
  patchDraft: (patch: Partial<Pick<EditableWikiPage, "title" | "contentMd">>) => void;
  isDirty: boolean;
};

const WikiInlineEditContext = createContext<WikiInlineEditContextValue | null>(null);

export function WikiInlineEditProvider({
  isAdmin,
  labels,
  children,
}: {
  isAdmin: boolean;
  labels: WikiInlineEditLabels;
  children: ReactNode;
}) {
  const router = useRouter();
  const [editablePage, setEditablePage] = useState<EditableWikiPage | null>(null);
  const [baseline, setBaseline] = useState<EditableWikiPage | null>(null);
  const [draft, setDraft] = useState<EditableWikiPage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [wikiPages, setWikiPages] = useState<WikiPageBrief[]>([]);
  const registeredIdRef = useRef<string | null>(null);

  const setStatus = useCallback((text: string, tone: "neutral" | "error" = "neutral") => {
    setStatusText(text);
    setStatusTone(tone);
  }, []);

  const { saveDraft, togglePublish: togglePublishApi } = useWikiInlineSave({ labels, setStatus });

  const registerPage = useCallback((page: EditableWikiPage) => {
    registeredIdRef.current = page.id;
    setEditablePage(page);
    setBaseline(page);
    if (!isEditing) setDraft(null);
  }, [isEditing]);

  const unregisterPage = useCallback(() => {
    registeredIdRef.current = null;
    setEditablePage(null);
    setBaseline(null);
    if (!isEditing) setDraft(null);
  }, [isEditing]);

  const loadWikiPages = useCallback(async (lang: string) => {
    try {
      const res = await apiFetch(`/api/admin/pages?lang=${encodeURIComponent(lang)}`);
      if (!res.ok) return;
      const rows = (await res.json()) as { path: string; title: string }[];
      setWikiPages(rows.map((r) => ({ path: r.path, title: r.title })));
    } catch {
      setWikiPages([]);
    }
  }, []);

  const startEdit = useCallback(() => {
    if (!isAdmin || !editablePage) return;
    const next = { ...editablePage };
    setDraft(next);
    setBaseline(next);
    setIsEditing(true);
    void loadWikiPages(editablePage.lang);
  }, [editablePage, isAdmin, loadWikiPages]);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return !pageDraftEquals(draft, baseline);
  }, [baseline, draft]);

  const cancelEdit = useCallback(() => {
    if (isDirty && !window.confirm(labels.dirtyConfirm)) return;
    setIsEditing(false);
    setDraft(null);
    setStatusText("");
    setStatusTone("neutral");
    router.refresh();
  }, [isDirty, labels.dirtyConfirm, router]);

  const saveNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!draft || !baseline) return false;
      const saved = await saveDraft(draft, baseline, opts);
      if (!saved) return false;
      setDraft(saved);
      setBaseline(saved);
      setEditablePage(saved);
      return true;
    },
    [baseline, draft, saveDraft],
  );

  const togglePublish = useCallback(async () => {
    const source = draft ?? editablePage;
    if (!source || source.systemKey) return;
    const saved = await togglePublishApi(source);
    if (!saved) return;
    setEditablePage(saved);
    setBaseline(saved);
    if (draft) setDraft(saved);
  }, [draft, editablePage, togglePublishApi]);

  const patchDraft = useCallback((patch: Partial<Pick<EditableWikiPage, "title" | "contentMd">>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    (): WikiInlineEditContextValue => ({
      canEdit: isAdmin && !!editablePage,
      isEditing,
      isAdmin,
      editablePage,
      draft,
      baseline,
      statusText,
      statusTone,
      wikiPages,
      labels,
      registerPage,
      unregisterPage,
      startEdit,
      cancelEdit,
      saveNow,
      togglePublish,
      patchDraft,
      isDirty,
    }),
    [
      baseline,
      cancelEdit,
      draft,
      editablePage,
      isAdmin,
      isDirty,
      isEditing,
      labels,
      patchDraft,
      registerPage,
      saveNow,
      startEdit,
      statusText,
      statusTone,
      togglePublish,
      unregisterPage,
      wikiPages,
    ],
  );

  return <WikiInlineEditContext.Provider value={value}>{children}</WikiInlineEditContext.Provider>;
}

export function useWikiInlineEdit() {
  const ctx = useContext(WikiInlineEditContext);
  if (!ctx) throw new Error("useWikiInlineEdit must be used within WikiInlineEditProvider");
  return ctx;
}

export function useWikiInlineEditOptional() {
  return useContext(WikiInlineEditContext);
}
