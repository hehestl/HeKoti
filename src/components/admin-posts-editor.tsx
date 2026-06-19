"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminExplorer, type AdminExplorerActions } from "@/components/admin-workbench/admin-explorer";
import { AdminEditorSplit } from "@/components/admin-workbench/admin-editor-split";
import { AdminEditorTabs } from "@/components/admin-workbench/admin-editor-tabs";
import { AdminMarkdownEditor } from "@/components/admin-markdown-editor";
import { useAdminPages } from "@/components/admin-workbench/admin-pages-provider";
import { useAdminOpenTabs } from "@/hooks/use-admin-open-tabs";
import { apiFetch } from "@/lib/api-fetch";
import type { Dictionary } from "@/lib/i18n";
import { isMoveIntoDescendant, nextPagePath } from "@/lib/page-move";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import { wikiPublicHref } from "@/lib/wiki-path";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

type PostsEditorContextValue = {
  explorer: ReactNode;
  main: ReactNode;
};

const PostsEditorContext = createContext<PostsEditorContextValue | null>(null);

export function AdminPostsEditorProvider({
  uiLang,
  enabledLanguages,
  dict,
  initialActivePath,
  activeAgentId,
  onStatusChange,
  previewVisible,
  splitRatio,
  onSplitRatioChange,
  children,
}: {
  uiLang: string;
  enabledLanguages: string[];
  dict: Dictionary;
  initialActivePath?: string;
  activeAgentId?: string | null;
  onStatusChange: (text: string, tone: "neutral" | "error") => void;
  previewVisible: boolean;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pagesByLang, getPage, upsertPage, removePages, patchPageLocal, setPagesForLang } =
    useAdminPages();
  const wb = dict.admin.workbench;

  const tabs = useAdminOpenTabs({
    pagesByLang,
    getPage,
    initialActivePath,
    dirtyConfirm: wb.dirtyConfirm,
  });

  const [isPending, startTransition] = useTransition();
  const [createModal, setCreateModal] = useState<{ lang: string; parentParts: string[]; isCategory?: boolean } | null>(
    null,
  );
  const [createTitle, setCreateTitle] = useState("");
  const [renameModal, setRenameModal] = useState<{ id: string; lang: string; title: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    id: string;
    lang: string;
    title: string;
    childCount: number;
  } | null>(null);

  const setStatus = useCallback(
    (text: string, tone: "neutral" | "error" = "neutral") => onStatusChange(text, tone),
    [onStatusChange],
  );

  const pagesForLang = useCallback((lang: string) => pagesByLang[lang] ?? [], [pagesByLang]);

  const getParentParts = useCallback((path: string, lang: string) => {
    const segs = pathSegmentsAfterLang(path, lang);
    return segs.length <= 1 ? [] : segs.slice(0, -1);
  }, []);

  const hasChildren = useCallback(
    (path: string, lang: string) =>
      pagesForLang(lang).some((p) => p.path !== path && p.path.startsWith(`${path}/`)),
    [pagesForLang],
  );

  const refreshPagesForLang = useCallback(
    async (lang: string) => {
      const res = await apiFetch(`/api/admin/pages?lang=${encodeURIComponent(lang)}`);
      if (!res.ok) return;
      const rows = (await res.json()) as AdminPageRow[];
      setPagesForLang(
        lang,
        rows.map((r) => ({
          ...r,
          lang,
          icon: r.icon ?? null,
          isCategory: r.isCategory ?? false,
        })),
      );
    },
    [setPagesForLang],
  );

  const syncActivePathUrl = useCallback(
    (page?: AdminPageRow) => {
      if (!page) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "posts");
      params.set("activePath", page.path);
      router.replace(`/${uiLang}/admin?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, uiLang],
  );

  const patchPageApi = useCallback(
    async (
      id: string,
      lang: string,
      patch: {
        title?: string;
        contentMd?: string;
        isPublished?: boolean;
        isCategory?: boolean;
        icon?: string | null;
        navOrder?: number;
        parentPathParts?: string[];
      },
    ) => {
      const res = await apiFetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as AdminPageRow & { message?: string };
      if (!res.ok) throw new Error(body.message || "Update failed");
      const row = { ...body, lang };
      patchPageLocal(id, lang, row);
      return row;
    },
    [patchPageLocal],
  );

  const saveActive = useCallback(() => {
    const page = tabs.activePage;
    if (!page) return;
    setStatus(dict.admin.posts.saving);
    startTransition(async () => {
      try {
        const saved = await patchPageApi(page.id, page.lang, {
          title: page.title,
          contentMd: page.contentMd,
          isPublished: page.isPublished,
        });
        tabs.markSaved(saved.id, saved.lang, saved);
        setStatus(dict.admin.posts.saved);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
      }
    });
  }, [dict.admin.posts, patchPageApi, setStatus, tabs]);

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

  const createWithParent = async (
    lang: string,
    parentPathParts: string[],
    title: string,
    isCategory = false,
  ) => {
    const response = await apiFetch("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lang,
        title,
        contentMd: "",
        isPublished: false,
        isCategory,
        icon: isCategory ? "folder" : null,
        parentPathParts,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      setStatus(body.message ?? dict.admin.posts.failed, "error");
      return;
    }
    const data = (await response.json()) as AdminPageRow;
    const row: AdminPageRow = {
      ...data,
      lang,
      icon: data.icon ?? null,
      isCategory: data.isCategory ?? isCategory,
    };
    upsertPage(row);
    if (!isCategory) {
      tabs.openPageTab(row);
      syncActivePathUrl(row);
    }
    setStatus(dict.admin.posts.saved);
  };

  const submitCreate = async () => {
    if (!createModal) return;
    const title = createTitle.trim();
    if (!title) return;
    await createWithParent(createModal.lang, createModal.parentParts, title, createModal.isCategory === true);
    setCreateModal(null);
    setCreateTitle("");
  };

  const submitRename = async () => {
    if (!renameModal) return;
    const title = renameModal.title.trim();
    if (!title) return;
    patchPageLocal(renameModal.id, renameModal.lang, { title });
    try {
      await patchPageApi(renameModal.id, renameModal.lang, { title });
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
    }
    setRenameModal(null);
  };

  const countDescendants = useCallback(
    (path: string, lang: string) =>
      pagesForLang(lang).filter((p) => p.path !== path && p.path.startsWith(`${path}/`)).length,
    [pagesForLang],
  );

  const submitDelete = async () => {
    if (!deleteModal) return;
    const res = await apiFetch(`/api/pages/${deleteModal.id}`, { method: "DELETE" });
    const body = (await res.json()) as { ok?: boolean; deletedIds?: string[]; message?: string };
    if (!res.ok || !body.ok) {
      setStatus(body.message ?? dict.admin.posts.deleteFailed, "error");
      return;
    }
    const deletedIds = body.deletedIds?.length ? body.deletedIds : [deleteModal.id];
    removePages(deletedIds, deleteModal.lang);
    for (const id of deletedIds) {
      tabs.closeTab(id, deleteModal.lang, true);
    }
    setStatus(dict.admin.posts.deleted);
    setDeleteModal(null);
  };

  const applyMove = async (
    fromId: string,
    lang: string,
    newParentParts: string[],
    targetPageId: string | null,
    mode: "before" | "after" | "inside",
  ) => {
    const pages = pagesForLang(lang);
    const from = pages.find((p) => p.id === fromId);
    if (!from) return;

    const fromSlug = pathSegmentsAfterLang(from.path, lang).slice(-1)[0] ?? "";
    const targetPath = nextPagePath(lang, newParentParts, fromSlug);
    if (isMoveIntoDescendant(from.path, targetPath)) {
      setStatus(dict.admin.posts.cantMoveIntoDescendant, "error");
      return;
    }

    const siblingIds = pages
      .filter((p) => getParentParts(p.path, lang).join("/") === newParentParts.join("/"))
      .map((p) => p.id);

    let insertAt = siblingIds.length;
    if (targetPageId && mode !== "inside") {
      const targetIndex = siblingIds.indexOf(targetPageId);
      if (targetIndex >= 0) insertAt = mode === "before" ? targetIndex : targetIndex + 1;
    }

    const ordered = siblingIds.filter((id) => id !== fromId);
    ordered.splice(insertAt, 0, fromId);

    setStatus(dict.admin.posts.saving);
    const pathChanged = from.path !== targetPath;
    try {
      await Promise.all(
        ordered.map((id, i) => {
          const patch: { navOrder: number; parentPathParts?: string[] } = { navOrder: i * 10 };
          if (id === fromId) patch.parentPathParts = newParentParts;
          return patchPageApi(id, lang, patch);
        }),
      );
      if (pathChanged) {
        await refreshPagesForLang(lang);
      }
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
    }
  };

  const movePageByDrop: AdminExplorerActions["onMoveByDrop"] = async (fromId, lang, target) => {
    const pages = pagesForLang(lang);
    const from = pages.find((p) => p.id === fromId);
    if (!from) return;

    if (target.kind === "root") {
      await applyMove(fromId, lang, [], null, "after");
      return;
    }

    if (target.kind === "folder") {
      const parentParts = pathSegmentsAfterLang(target.pathKey, lang);
      await applyMove(fromId, lang, parentParts, null, "inside");
      return;
    }

    const targetPage = pages.find((p) => p.id === target.targetId);
    if (!targetPage || fromId === target.targetId) return;

    const targetParent = getParentParts(targetPage.path, lang);
    const targetInside = pathSegmentsAfterLang(targetPage.path, lang);
    const newParentParts = target.mode === "inside" ? targetInside : targetParent;
    await applyMove(fromId, lang, newParentParts, target.targetId, target.mode);
  };

  const liftUp = async (id: string, lang: string) => {
    const page = getPage(id, lang);
    if (!page) return;
    const parentParts = getParentParts(page.path, lang);
    if (parentParts.length === 0) {
      setStatus(dict.admin.posts.cantMoveRoot, "error");
      return;
    }
    const newParentParts = parentParts.slice(0, -1);
    const fromSlug = pathSegmentsAfterLang(page.path, lang).slice(-1)[0] ?? "";
    const targetPath = nextPagePath(lang, newParentParts, fromSlug);
    if (isMoveIntoDescendant(page.path, targetPath)) {
      setStatus(dict.admin.posts.cantMoveIntoDescendant, "error");
      return;
    }
    const maxNav = pagesForLang(lang)
      .filter((p) => getParentParts(p.path, lang).join("/") === newParentParts.join("/"))
      .reduce((m, p) => Math.max(m, p.navOrder), 0);
    setStatus(dict.admin.posts.saving);
    try {
      await patchPageApi(id, lang, { parentPathParts: newParentParts, navOrder: maxNav + 10 });
      await refreshPagesForLang(lang);
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
    }
  };

  const localizeBranch = async (id: string, lang: string) => {
    setStatus(dict.admin.posts.aiLocalizingBranch.replace("{count}", "…"));
    try {
      const res = await apiFetch(`/api/pages/${id}/localize-branch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: activeAgentId ?? undefined }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !body.ok) {
        setStatus(body.message ?? dict.admin.posts.failed, "error");
        return;
      }
      setStatus(dict.admin.posts.aiLocalizedBranch.replace("{pages}", "—").replace("{created}", "—"));
    } catch {
      setStatus(dict.admin.posts.failed, "error");
    }
  };

  const localizeAll = async (id: string, lang: string) => {
    void lang;
    setStatus(dict.admin.posts.aiLocalizingAll);
    try {
      const res = await apiFetch(`/api/pages/${id}/localize-all`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: activeAgentId ?? undefined }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !body.ok) {
        setStatus(body.message ?? dict.admin.posts.failed, "error");
        return;
      }
      setStatus(dict.admin.posts.aiLocalizedAll);
    } catch {
      setStatus(dict.admin.posts.failed, "error");
    }
  };

  const explorerActions: AdminExplorerActions = useMemo(
    () => ({
      activePageId: tabs.activePage?.id,
      activePageLang: tabs.activePage?.lang,
      onSelectPage: (page) => {
        tabs.openPageTab(page);
        syncActivePathUrl(page);
      },
      onRename: (id, lang) => {
        const page = getPage(id, lang);
        if (page) setRenameModal({ id, lang, title: page.title });
      },
      onDelete: (id, lang) => {
        const page = getPage(id, lang);
        if (page) {
          setDeleteModal({
            id,
            lang,
            title: page.title,
            childCount: countDescendants(page.path, lang),
          });
        }
      },
      onTogglePublish: async (id, lang) => {
        const page = getPage(id, lang);
        if (!page) return;
        const next = !page.isPublished;
        patchPageLocal(id, lang, { isPublished: next });
        try {
          await patchPageApi(id, lang, { isPublished: next });
          setStatus(dict.admin.posts.saved);
        } catch (e) {
          patchPageLocal(id, lang, { isPublished: page.isPublished });
          setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
        }
      },
      onMoveByDrop: movePageByDrop,
      onAddChild: (id, lang) => {
        const page = getPage(id, lang);
        if (!page) return;
        setCreateModal({ lang, parentParts: pathSegmentsAfterLang(page.path, lang) });
        setCreateTitle("");
      },
      onAddSibling: (id, lang) => {
        const page = getPage(id, lang);
        if (!page) return;
        const segs = pathSegmentsAfterLang(page.path, lang);
        setCreateModal({ lang, parentParts: segs.length <= 1 ? [] : segs.slice(0, -1) });
        setCreateTitle("");
      },
      onCreateAtRoot: (lang) => {
        setCreateModal({ lang, parentParts: [], isCategory: false });
        setCreateTitle("");
      },
      onCreateCategory: (lang, parentParts) => {
        setCreateModal({ lang, parentParts, isCategory: true });
        setCreateTitle("");
      },
      onRefresh: async (scope) => {
        setStatus(dict.admin.workbench.refreshing);
        try {
          const url = scope === "all" ? "/api/admin/pages?all=1" : `/api/admin/pages?lang=${encodeURIComponent(scope)}`;
          const res = await apiFetch(url);
          if (!res.ok) throw new Error(dict.admin.posts.failed);
          const data = (await res.json()) as AdminPageRow[] | AdminPagesByLang;
          if (scope === "all" && data && typeof data === "object" && !Array.isArray(data)) {
            for (const [lang, rows] of Object.entries(data)) {
              setPagesForLang(
                lang,
                rows.map((r) => ({
                  ...r,
                  lang,
                  icon: r.icon ?? null,
                  isCategory: r.isCategory ?? false,
                })),
              );
            }
          } else if (Array.isArray(data)) {
            setPagesForLang(
              scope,
              data.map((r) => ({
                ...r,
                lang: scope,
                icon: r.icon ?? null,
                isCategory: r.isCategory ?? false,
              })),
            );
          }
          setStatus(dict.admin.workbench.refreshed);
        } catch (e) {
          setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
        }
      },
      onChangeIcon: async (id, lang, icon) => {
        patchPageLocal(id, lang, { icon });
        try {
          await patchPageApi(id, lang, { icon });
          setStatus(dict.admin.posts.saved);
        } catch (e) {
          setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
        }
      },
      onLiftUp: liftUp,
      onLocalizeBranch: localizeBranch,
      onLocalizeAll: localizeAll,
      onOpenPublic: (page) => {
        window.open(wikiPublicHref(page.lang, page.path), "_blank", "noopener,noreferrer");
      },
    }),
    [dict.admin.posts, dict.admin.workbench, enabledLanguages, getPage, liftUp, localizeAll, localizeBranch, movePageByDrop, patchPageApi, patchPageLocal, setPagesForLang, setStatus, syncActivePathUrl, tabs],
  );

  const active = tabs.activePage;
  const wikiPages = useMemo(
    () => (active ? pagesForLang(active.lang).map((p) => ({ path: p.path, title: p.title })) : []),
    [active, pagesForLang],
  );

  const explorer = (
    <AdminExplorer pagesByLang={pagesByLang} enabledLanguages={enabledLanguages} dict={dict} actions={explorerActions} />
  );

  const main = (
    <div className="admin-editor-main">
      <AdminEditorTabs
        tabs={tabs.openTabs}
        activeTabId={tabs.activeTabId}
        onSelect={(key) => {
          tabs.setActiveTabId(key);
          const sep = key.indexOf(":");
          if (sep < 0) return;
          const pl = key.slice(0, sep);
          const pid = key.slice(sep + 1);
          const page = getPage(pid, pl);
          if (page) syncActivePathUrl(page);
        }}
        onClose={(pageId, lang) => tabs.closeTab(pageId, lang)}
        onSave={() => saveActive()}
        dict={wb}
      />
      {!active ? (
        <p className="admin-sidebar-hint">{wb.noOpenTabs}</p>
      ) : (
        <>
          <input
            className="admin-editor-title-input"
            style={inputStyle}
            value={active.title}
            onChange={(e) => tabs.patchDraft(active.id, active.lang, { title: e.target.value })}
          />
          <AdminEditorSplit
            markdown={active.contentMd}
            lang={active.lang}
            pagePath={active.path}
            previewVisible={previewVisible}
            splitRatio={splitRatio}
            onSplitRatioChange={onSplitRatioChange}
            dict={wb}
            editor={
              <AdminMarkdownEditor
                value={active.contentMd}
                onChange={(v) => tabs.patchDraft(active.id, active.lang, { contentMd: v })}
                lang={active.lang}
                wikiPages={wikiPages}
                dict={dict}
                height="100%"
              />
            }
          />
        </>
      )}
      {createModal ? (
        <ModalCard
          title={createModal.isCategory ? dict.admin.workbench.createCategory : dict.admin.posts.pageTitle}
          cancelLabel={dict.common.cancel}
          onCancel={() => {
            setCreateModal(null);
            setCreateTitle("");
          }}
          onSubmit={() => void submitCreate()}
          submitLabel={dict.common.save}
          submitDisabled={!createTitle.trim() || isPending}
        >
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={createTitle}
            autoFocus
            onChange={(e) => setCreateTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitCreate();
            }}
          />
        </ModalCard>
      ) : null}
      {renameModal ? (
        <ModalCard
          title={dict.admin.posts.renamePrompt}
          cancelLabel={dict.common.cancel}
          onCancel={() => setRenameModal(null)}
          onSubmit={() => void submitRename()}
          submitLabel={dict.common.save}
          submitDisabled={!renameModal.title.trim()}
        >
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={renameModal.title}
            autoFocus
            onChange={(e) => setRenameModal((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitRename();
            }}
          />
        </ModalCard>
      ) : null}
      {deleteModal ? (
        <ModalCard
          title={dict.admin.posts.delete}
          cancelLabel={dict.common.cancel}
          onCancel={() => setDeleteModal(null)}
          onSubmit={() => void submitDelete()}
          submitLabel={dict.admin.posts.delete}
        >
          <p style={{ margin: 0 }}>
            {deleteModal.childCount > 0
              ? dict.admin.posts.deleteConfirmCascade
                  .replace("{title}", deleteModal.title)
                  .replace("{count}", String(deleteModal.childCount))
              : dict.admin.posts.deleteConfirm.replace("{title}", deleteModal.title)}
          </p>
        </ModalCard>
      ) : null}
    </div>
  );

  return (
    <PostsEditorContext.Provider value={{ explorer, main }}>{children}</PostsEditorContext.Provider>
  );
}

export function useAdminPostsEditor() {
  const ctx = useContext(PostsEditorContext);
  if (!ctx) throw new Error("useAdminPostsEditor must be used within AdminPostsEditorProvider");
  return ctx;
}

function ModalCard({
  title,
  children,
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitDisabled = false,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal onClick={onCancel}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {children}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" style={buttonStyle} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, background: "var(--accent)", color: "#fff" }}
            onClick={onSubmit}
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use AdminPostsEditorProvider + useAdminPostsEditor */
export function AdminEditor(props: Parameters<typeof AdminPostsEditorProvider>[0]) {
  return (
    <AdminPostsEditorProvider {...props}>
      <AdminPostsEditorLegacy />
    </AdminPostsEditorProvider>
  );
}

function AdminPostsEditorLegacy() {
  const { main } = useAdminPostsEditor();
  return main;
}

export function AdminEditorExplorer() {
  const { explorer } = useAdminPostsEditor();
  return explorer;
}

export function AdminEditorMain() {
  const { main } = useAdminPostsEditor();
  return main;
}
