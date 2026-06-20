import { useCallback, useEffect, useRef } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { AdminPageRow } from "@/types/admin-workbench";

type OpenTabsApi = {
  activePage: AdminPageRow | undefined;
  activeTabId: string;
  getDraftPage: (pageId: string, lang: string) => AdminPageRow | undefined;
  isDirty: (pageId: string, lang: string) => boolean;
  markSaved: (pageId: string, lang: string, page: Pick<AdminPageRow, "title" | "contentMd" | "isPublished" | "showToc">) => void;
};

type PatchPageApi = (
  id: string,
  lang: string,
  patch: {
    title?: string;
    contentMd?: string;
    isPublished?: boolean;
    showToc?: boolean;
  },
) => Promise<AdminPageRow>;

export function useAdminPageSave({
  tabs,
  patchPageApi,
  setStatus,
  dict,
  isNotes,
}: {
  tabs: OpenTabsApi;
  patchPageApi: PatchPageApi;
  setStatus: (text: string, tone?: "neutral" | "error") => void;
  dict: Dictionary;
  isNotes: boolean;
}) {
  const savingRef = useRef(false);

  const savePage = useCallback(
    async (pageId: string, lang: string, opts?: { silent?: boolean }) => {
      const page = tabs.getDraftPage(pageId, lang);
      if (!page || !tabs.isDirty(pageId, lang)) return;
      if (savingRef.current) return;
      savingRef.current = true;
      if (!opts?.silent) setStatus(dict.admin.posts.saving);
      try {
        const saved = await patchPageApi(page.id, page.lang, {
          title: page.title,
          contentMd: page.contentMd,
          isPublished: isNotes ? false : page.isPublished,
          showToc: page.showToc,
        });
        tabs.markSaved(saved.id, saved.lang, saved);
        setStatus(isNotes ? dict.admin.notes.idle : dict.admin.posts.saved);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
      } finally {
        savingRef.current = false;
      }
    },
    [dict.admin.notes, dict.admin.posts, isNotes, patchPageApi, setStatus, tabs],
  );

  const saveActive = useCallback(() => {
    const page = tabs.activePage;
    if (!page) return;
    void savePage(page.id, page.lang);
  }, [savePage, tabs.activePage]);

  const active = tabs.activePage;

  useEffect(() => {
    if (!active || !tabs.isDirty(active.id, active.lang)) return;
    const { id, lang } = active;
    const timer = window.setTimeout(() => {
      void savePage(id, lang, { silent: true });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [active?.id, active?.lang, active?.title, active?.contentMd, active?.showToc, active, savePage, tabs]);

  const prevActiveTabRef = useRef(tabs.activeTabId);
  useEffect(() => {
    const prev = prevActiveTabRef.current;
    const current = tabs.activeTabId;
    if (prev && prev !== current) {
      const sep = prev.indexOf(":");
      if (sep >= 0) {
        const lang = prev.slice(0, sep);
        const pageId = prev.slice(sep + 1);
        if (tabs.isDirty(pageId, lang)) {
          void savePage(pageId, lang, { silent: true });
        }
      }
    }
    prevActiveTabRef.current = current;
  }, [savePage, tabs.activeTabId, tabs]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
        if (!t.closest(".admin-editor-main")) return;
      }
      e.preventDefault();
      saveActive();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveActive]);

  return { savePage, saveActive, active };
}
