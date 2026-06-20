"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminOpenTab, AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";

const STORAGE_KEY_POSTS = "admin-open-tabs";
const STORAGE_KEY_NOTES = "admin-open-tabs-notes";

type StoredTab = { pageId: string; lang: string };

function loadStoredTabs(storageKey: string): StoredTab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTab[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredTabs(storageKey: string, tabs: StoredTab[]) {
  localStorage.setItem(storageKey, JSON.stringify(tabs));
}

export function clearNotesOpenTabs() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_NOTES);
}

export function tabKey(pageId: string, lang: string) {
  return `${lang}:${pageId}`;
}

export function useAdminOpenTabs({
  pagesByLang,
  getPage,
  initialActivePath,
  dirtyConfirm,
  storageKey = STORAGE_KEY_POSTS,
}: {
  pagesByLang: AdminPagesByLang;
  getPage: (id: string, lang: string) => AdminPageRow | undefined;
  initialActivePath?: string;
  dirtyConfirm: string;
  storageKey?: string;
}) {
  const [openTabs, setOpenTabs] = useState<AdminOpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<AdminPageRow>>>({});
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({});
  const initialized = useRef(false);

  const isDirty = useCallback(
    (pageId: string, lang: string) => {
      const page = getPage(pageId, lang);
      if (!page) return false;
      const key = tabKey(pageId, lang);
      const draft = drafts[key];
      if (!draft) return false;
      const merged = { ...page, ...draft };
      const snap = savedSnapshots[key];
      const payload = JSON.stringify({ title: merged.title, contentMd: merged.contentMd, isPublished: merged.isPublished });
      return snap ? snap !== payload : true;
    },
    [drafts, getPage, savedSnapshots],
  );

  const openPageTab = useCallback(
    (page: AdminPageRow) => {
      const key = tabKey(page.id, page.lang);
      setSavedSnapshots((prev) =>
        prev[key]
          ? prev
          : {
              ...prev,
              [key]: JSON.stringify({ title: page.title, contentMd: page.contentMd, isPublished: page.isPublished }),
            },
      );
      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.pageId === page.id && t.lang === page.lang);
        if (exists) {
          return prev.map((t) =>
            t.pageId === page.id && t.lang === page.lang
              ? { ...t, title: page.title, dirty: isDirty(page.id, page.lang) }
              : t,
          );
        }
        return [...prev, { pageId: page.id, lang: page.lang, title: page.title, dirty: false }];
      });
      setActiveTabId(key);
    },
    [isDirty],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (initialActivePath) {
      for (const pages of Object.values(pagesByLang)) {
        const hit = pages.find((p) => p.path === initialActivePath);
        if (hit) {
          openPageTab(hit);
          return;
        }
      }
    }

    for (const st of loadStoredTabs(storageKey)) {
      const page = getPage(st.pageId, st.lang);
      if (page) openPageTab(page);
    }
  }, [getPage, initialActivePath, openPageTab, pagesByLang, storageKey]);

  useEffect(() => {
    if (openTabs.length === 0) return;
    saveStoredTabs(storageKey, openTabs.map((t) => ({ pageId: t.pageId, lang: t.lang })));
  }, [openTabs, storageKey]);

  useEffect(() => {
    setOpenTabs((prev) =>
      prev.map((t) => ({
        ...t,
        dirty: isDirty(t.pageId, t.lang),
        title: getPage(t.pageId, t.lang)?.title ?? t.title,
      })),
    );
  }, [drafts, getPage, isDirty, savedSnapshots]);

  const hasDirty = useMemo(() => openTabs.some((t) => isDirty(t.pageId, t.lang)), [openTabs, isDirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasDirty) return;
      e.preventDefault();
      e.returnValue = dirtyConfirm;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyConfirm, hasDirty]);

  const closeTab = useCallback(
    (pageId: string, lang: string, force = false) => {
      if (!force && isDirty(pageId, lang) && !window.confirm(dirtyConfirm)) return false;
      const key = tabKey(pageId, lang);
      setOpenTabs((prev) => {
        const rest = prev.filter((t) => !(t.pageId === pageId && t.lang === lang));
        setActiveTabId((current) => (current === key ? (rest[0] ? tabKey(rest[0].pageId, rest[0].lang) : "") : current));
        return rest;
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSavedSnapshots((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return true;
    },
    [dirtyConfirm, isDirty],
  );

  const patchDraft = useCallback((pageId: string, lang: string, patch: Partial<AdminPageRow>) => {
    const key = tabKey(pageId, lang);
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const markSaved = useCallback(
    (pageId: string, lang: string, page: Pick<AdminPageRow, "title" | "contentMd" | "isPublished">) => {
      const key = tabKey(pageId, lang);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSavedSnapshots((prev) => ({
        ...prev,
        [key]: JSON.stringify({ title: page.title, contentMd: page.contentMd, isPublished: page.isPublished }),
      }));
    },
    [],
  );

  const getDraftPage = useCallback(
    (pageId: string, lang: string): AdminPageRow | undefined => {
      const base = getPage(pageId, lang);
      if (!base) return undefined;
      const draft = drafts[tabKey(pageId, lang)];
      return draft ? { ...base, ...draft } : base;
    },
    [drafts, getPage],
  );

  const activePage = useMemo(() => {
    if (!activeTabId) return undefined;
    const sep = activeTabId.indexOf(":");
    if (sep < 0) return undefined;
    const lang = activeTabId.slice(0, sep);
    const pageId = activeTabId.slice(sep + 1);
    return getDraftPage(pageId, lang);
  }, [activeTabId, getDraftPage]);

  return {
    openTabs,
    activeTabId,
    activePage,
    setActiveTabId,
    openPageTab,
    closeTab,
    patchDraft,
    markSaved,
    getDraftPage,
    isDirty,
    hasDirty,
    tabKey,
  };
}
