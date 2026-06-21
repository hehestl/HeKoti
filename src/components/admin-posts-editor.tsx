"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageRevisionPanel } from "@/components/admin-page-revision-panel";
import { AdminExplorer } from "@/components/admin-workbench/admin-explorer";
import { AdminPostsEditorMain } from "@/components/admin-posts-editor-main";
import { AdminActionToast } from "@/components/admin-workbench/admin-action-toast";
import { buildStatusBarExtras, type AdminStatusBarExtras } from "@/components/admin-workbench/admin-status-bar";
import { useAdminPages } from "@/components/admin-workbench/admin-pages-provider";
import { useAdminOpenTabs } from "@/hooks/use-admin-open-tabs";
import { useAdminPageSave } from "@/hooks/use-admin-page-save";
import { useAdminPostsPageOps } from "@/hooks/use-admin-posts-page-ops";
import { apiFetch } from "@/lib/api-fetch";
import { exportArticleCsv, exportArticleMarkdown, exportArticlePdf } from "@/lib/article-export";
import type { Dictionary } from "@/lib/i18n";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import { toSlug } from "@/lib/slug";
import type { WikiIconKey } from "@/lib/wiki-icon-presets";
import type { AdminPageRow, AdminPagesByLang, AdminPagesStore } from "@/types/admin-workbench";

type PostsEditorContextValue = {
  explorer: ReactNode;
  main: ReactNode;
  statusBarExtras: AdminStatusBarExtras | null;
};

const PostsEditorContext = createContext<PostsEditorContextValue | null>(null);

export type { AdminPagesStore };

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
  variant = "posts",
  pagesStore: pagesStoreProp,
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
  variant?: "posts" | "notes";
  pagesStore?: AdminPagesStore;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wikiStore = useAdminPages();
  const store = pagesStoreProp ?? wikiStore;
  const { pagesByLang, getPage, upsertPage, removePages, patchPageLocal, setPagesForLang } = store;
  const isNotes = variant === "notes";
  const explorerLanguages = isNotes ? [uiLang] : enabledLanguages;
  const scopeQuery = isNotes ? "&scope=notes" : "";
  const wb = dict.admin.workbench;

  const tabs = useAdminOpenTabs({
    pagesByLang,
    getPage,
    initialActivePath,
    dirtyConfirm: wb.dirtyConfirm,
    storageKey: isNotes ? "admin-open-tabs-notes" : "admin-open-tabs",
  });

  const [isPending, startTransition] = useTransition();
  const [createModal, setCreateModal] = useState<{ lang: string; parentParts: string[]; isCategory?: boolean } | null>(
    null,
  );
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSlugManual, setCreateSlugManual] = useState(false);
  const [revealPagePath, setRevealPagePath] = useState<{ lang: string; path: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{
    id: string;
    lang: string;
    title: string;
    slug: string;
    icon: WikiIconKey | null;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    id: string;
    lang: string;
    title: string;
    childCount: number;
  } | null>(null);
  const [sendToChatPending, setSendToChatPending] = useState(false);
  const [chatToast, setChatToast] = useState<{ messengerUrl: string } | null>(null);
  const [historyPage, setHistoryPage] = useState<{ id: string; title: string } | null>(null);

  const setStatus = useCallback(
    (text: string, tone: "neutral" | "error" = "neutral") => onStatusChange(text, tone),
    [onStatusChange],
  );

  const refreshPagesForLang = useCallback(
    async (lang: string) => {
      const res = await apiFetch(`/api/admin/pages?lang=${encodeURIComponent(lang)}${scopeQuery}`);
      if (!res.ok) return;
      const rows = (await res.json()) as AdminPageRow[];
      setPagesForLang(
        lang,
        rows.map((r) => ({
          ...r,
          lang,
          icon: r.icon ?? null,
          isCategory: r.isCategory ?? false,
          scope: r.scope ?? (isNotes ? "NOTES" : "WIKI"),
          systemKey: r.systemKey ?? null,
          showToc: r.showToc ?? true,
        })),
      );
    },
    [isNotes, scopeQuery, setPagesForLang],
  );

  const syncActivePathUrl = useCallback(
    (page?: AdminPageRow) => {
      if (!page) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", variant);
      params.set("activePath", page.path);
      router.replace(`/${uiLang}/admin?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, uiLang, variant],
  );

  const patchPageApi = useCallback(
    async (
      id: string,
      lang: string,
      patch: {
        title?: string;
        slug?: string;
        contentMd?: string;
        isPublished?: boolean;
        showToc?: boolean;
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
      const body = (await res.json()) as AdminPageRow & { message?: string; error?: string };
      if (!res.ok) {
        const err = new Error(body.message || "Update failed") as Error & { code?: string };
        err.code = body.error;
        throw err;
      }
      const row = { ...body, lang, showToc: body.showToc ?? true };
      patchPageLocal(id, lang, row);
      return row;
    },
    [patchPageLocal],
  );

  const { savePage, active } = useAdminPageSave({
    tabs,
    patchPageApi,
    setStatus,
    dict,
    isNotes,
  });

  useEffect(() => {
    if (isNotes) setStatus(dict.admin.notes.idle);
  }, [dict.admin.notes.idle, isNotes, setStatus]);

  const {
    explorerActions,
    submitCreate,
    submitRename,
    submitDelete,
    renamePreviewPath,
    renameSlugValid,
    createPreviewPath,
    createSlugValid,
    pagesForLang,
  } = useAdminPostsPageOps({
    dict,
    isNotes,
    scopeQuery,
    activeAgentId,
    pagesByLang,
    getPage,
    upsertPage,
    removePages,
    patchPageLocal,
    setPagesForLang,
    setStatus,
    tabs,
    syncActivePathUrl,
    patchPageApi,
    refreshPagesForLang,
    createModal,
    setCreateModal,
    createTitle,
    setCreateTitle,
    createSlug,
    setCreateSlug,
    createSlugManual,
    setCreateSlugManual,
    setRevealPagePath,
    renameModal,
    setRenameModal,
    deleteModal,
    setDeleteModal,
  });

  const wikiPages = useMemo(
    () => (active ? pagesForLang(active.lang).map((p) => ({ path: p.path, title: p.title })) : []),
    [active, pagesForLang],
  );

  const onCreateTitleChange = useCallback(
    (title: string) => {
      setCreateTitle(title);
      if (!createSlugManual) setCreateSlug(toSlug(title.trim()));
    },
    [createSlugManual],
  );

  const explorerActionsWithHistory = useMemo(
    () => ({
      ...explorerActions,
      onOpenHistory: isNotes
        ? undefined
        : (page: AdminPageRow) => setHistoryPage({ id: page.id, title: page.title }),
    }),
    [explorerActions, isNotes],
  );

  const explorer = (
    <AdminExplorer
      pagesByLang={pagesByLang}
      enabledLanguages={explorerLanguages}
      dict={dict}
      actions={explorerActionsWithHistory}
      variant={variant}
      revealPagePath={revealPagePath}
      onRevealPageDone={() => setRevealPagePath(null)}
    />
  );

  const main = (
    <AdminPostsEditorMain
      dict={dict}
      wb={wb}
      tabs={tabs}
      active={active}
      savePage={savePage}
      getPage={getPage}
      syncActivePathUrl={syncActivePathUrl}
      previewVisible={previewVisible}
      splitRatio={splitRatio}
      onSplitRatioChange={onSplitRatioChange}
      wikiPages={wikiPages}
      isPending={isPending}
      createModal={createModal}
      createTitle={createTitle}
      createSlug={createSlug}
      createPreviewPath={createPreviewPath}
      createSlugValid={createSlugValid}
      onCreateTitleChange={onCreateTitleChange}
      onCreateSlugChange={(slug) => {
        setCreateSlugManual(true);
        setCreateSlug(slug);
      }}
      onCreateCancel={() => {
        setCreateModal(null);
        setCreateTitle("");
        setCreateSlug("");
        setCreateSlugManual(false);
      }}
      onCreateSubmit={() => void submitCreate()}
      renameModal={renameModal}
      renamePreviewPath={renamePreviewPath}
      renameSlugValid={renameSlugValid}
      onRenameChange={(patch) => setRenameModal((prev) => (prev ? { ...prev, ...patch } : prev))}
      onRenameCancel={() => setRenameModal(null)}
      onRenameSubmit={() => void submitRename()}
      deleteModal={deleteModal}
      onDeleteCancel={() => setDeleteModal(null)}
      onDeleteSubmit={() => void submitDelete()}
      onOpenHistory={
        active && !isNotes
          ? () => setHistoryPage({ id: active.id, title: active.title })
          : undefined
      }
    />
  );

  const historyPanel =
    historyPage && !isNotes ? (
      <AdminPageRevisionPanel
        pageId={historyPage.id}
        pageTitle={historyPage.title}
        uiLang={uiLang}
        dict={dict}
        onClose={() => setHistoryPage(null)}
      />
    ) : null;

  const handleSendToChat = useCallback(async () => {
    const draft = active ? tabs.getDraftPage(active.id, active.lang) : undefined;
    if (!draft || isNotes) return;

    setSendToChatPending(true);
    setStatus(wb.sendToChatPending);
    try {
      const res = await apiFetch("/api/admin/wiki/send-to-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId: draft.id,
          title: draft.title,
          lang: draft.lang,
          path: draft.path,
          slug: draft.slug,
          contentMd: draft.contentMd,
          isPublished: draft.isPublished,
          updatedAt: new Date().toISOString(),
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        messengerUrl?: string;
      };
      if (!res.ok) {
        if (body.code === "heron_required") {
          throw new Error(wb.sendToChatNoHeron);
        }
        if (body.code === "chat_account_required") {
          throw new Error(wb.sendToChatNoChatAccount);
        }
        throw new Error(body.message || wb.sendToChatFailed);
      }
      if (body.messengerUrl) {
        setChatToast({ messengerUrl: body.messengerUrl });
      }
      setStatus(wb.sendToChatOk);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : wb.sendToChatFailed, "error");
    } finally {
      setSendToChatPending(false);
    }
  }, [active, isNotes, setStatus, tabs, wb]);

  const statusBarExtras = useMemo(() => {
    const draft = active ? tabs.getDraftPage(active.id, active.lang) : undefined;
    if (!draft) return null;

    const exportRow = {
      title: draft.title,
      lang: draft.lang,
      path: draft.path,
      slug: draft.slug,
      isPublished: draft.isPublished,
      contentMd: draft.contentMd,
    };

    const base = buildStatusBarExtras(
      draft,
      {
        patchShowToc: (value) => tabs.patchDraft(draft.id, draft.lang, { showToc: value }),
        onExportPdf: () => {
          void exportArticlePdf(exportRow, draft.lang).catch((e) =>
            setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error"),
          );
        },
        onExportCsv: () => exportArticleCsv(exportRow),
        onExportMarkdown: () => exportArticleMarkdown(exportRow),
      },
      isNotes,
    );
    if (!base) return null;

    return {
      ...base,
      onSendToChat: isNotes ? undefined : () => void handleSendToChat(),
      sendToChatPending,
    };
  }, [
    active,
    dict.admin.posts.failed,
    handleSendToChat,
    isNotes,
    sendToChatPending,
    setStatus,
    tabs,
  ]);

  return (
    <PostsEditorContext.Provider value={{ explorer, main, statusBarExtras }}>
      {chatToast ? (
        <AdminActionToast
          message={wb.sendToChatOk}
          actionLabel={wb.sendToChatOpen}
          onAction={() => {
            window.open(chatToast.messengerUrl, "_blank", "noopener,noreferrer");
            setChatToast(null);
          }}
          onDismiss={() => setChatToast(null)}
        />
      ) : null}
      {historyPanel}
      {children}
    </PostsEditorContext.Provider>
  );
}

export function useAdminPostsEditorOptional() {
  return useContext(PostsEditorContext);
}

export function useAdminPostsEditor() {
  const ctx = useContext(PostsEditorContext);
  if (!ctx) throw new Error("useAdminPostsEditor must be used within AdminPostsEditorProvider");
  return ctx;
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
