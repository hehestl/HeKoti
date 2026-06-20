"use client";

import { useCallback, useMemo } from "react";
import type { AdminExplorerActions } from "@/components/admin-workbench/admin-explorer-types";
import { apiFetch } from "@/lib/api-fetch";
import type { Dictionary } from "@/lib/i18n";
import { isMoveIntoDescendant, nextPagePath } from "@/lib/page-move";
import { pathSegmentsAfterLang, wikiPublicHref } from "@/lib/wiki-path";
import { normalizePath, validateSlugInput } from "@/lib/slug";
import type { AdminPageRow, AdminPagesByLang } from "@/types/admin-workbench";
import type { useAdminOpenTabs } from "@/hooks/use-admin-open-tabs";

type OpenTabs = ReturnType<typeof useAdminOpenTabs>;

type PatchPageApi = (
  id: string,
  lang: string,
  patch: {
    title?: string;
    slug?: string;
    contentMd?: string;
    isPublished?: boolean;
    isCategory?: boolean;
    icon?: string | null;
    navOrder?: number;
    parentPathParts?: string[];
  },
) => Promise<AdminPageRow>;

type CreateModal = { lang: string; parentParts: string[]; isCategory?: boolean } | null;
type RenameModal = { id: string; lang: string; title: string; slug: string } | null;
type DeleteModal = { id: string; lang: string; title: string; childCount: number } | null;

export function useAdminPostsPageOps({
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
  renameModal,
  setRenameModal,
  deleteModal,
  setDeleteModal,
}: {
  dict: Dictionary;
  isNotes: boolean;
  scopeQuery: string;
  activeAgentId?: string | null;
  pagesByLang: AdminPagesByLang;
  getPage: (id: string, lang: string) => AdminPageRow | undefined;
  upsertPage: (page: AdminPageRow) => void;
  removePages: (ids: string[], lang: string) => void;
  patchPageLocal: (id: string, lang: string, patch: Partial<AdminPageRow>) => void;
  setPagesForLang: (lang: string, pages: AdminPageRow[]) => void;
  setStatus: (text: string, tone?: "neutral" | "error") => void;
  tabs: OpenTabs;
  syncActivePathUrl: (page?: AdminPageRow) => void;
  patchPageApi: PatchPageApi;
  refreshPagesForLang: (lang: string) => Promise<void>;
  createModal: CreateModal;
  setCreateModal: (v: CreateModal) => void;
  createTitle: string;
  setCreateTitle: (v: string) => void;
  renameModal: RenameModal;
  setRenameModal: (v: RenameModal | ((prev: RenameModal) => RenameModal)) => void;
  deleteModal: DeleteModal;
  setDeleteModal: (v: DeleteModal) => void;
}) {
  const pagesForLang = useCallback((lang: string) => pagesByLang[lang] ?? [], [pagesByLang]);

  const getParentParts = useCallback((path: string, lang: string) => {
    const segs = pathSegmentsAfterLang(path, lang);
    return segs.length <= 1 ? [] : segs.slice(0, -1);
  }, []);

  const createWithParent = async (
    lang: string,
    parentPathParts: string[],
    title: string,
    isCategory = false,
  ) => {
    const normalizedParentParts = isNotes
      ? parentPathParts.length === 0
        ? ["notes"]
        : parentPathParts[0] === "notes"
          ? parentPathParts
          : ["notes", ...parentPathParts]
      : parentPathParts;

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
        parentPathParts: normalizedParentParts,
        ...(isNotes ? { scope: "NOTES" } : {}),
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
      scope: data.scope ?? (isNotes ? "NOTES" : "WIKI"),
      systemKey: data.systemKey ?? null,
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
    const slug = validateSlugInput(renameModal.slug);
    if (!title || !slug) {
      setStatus(dict.admin.posts.slugInvalid, "error");
      return;
    }
    const page = getPage(renameModal.id, renameModal.lang);
    if (!page) return;
    const slugChanged = slug !== page.slug;

    patchPageLocal(renameModal.id, renameModal.lang, { title, slug });
    try {
      const saved = await patchPageApi(renameModal.id, renameModal.lang, { title, slug });
      if (slugChanged) {
        await refreshPagesForLang(renameModal.lang);
        tabs.openPageTab(saved);
        syncActivePathUrl(saved);
      }
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      patchPageLocal(renameModal.id, renameModal.lang, { title: page.title, slug: page.slug });
      const code = (e as Error & { code?: string }).code;
      if (code === "SLUG_COLLISION") setStatus(dict.admin.posts.slugConflict, "error");
      else if (code === "SLUG_INVALID") setStatus(dict.admin.posts.slugInvalid, "error");
      else setStatus(e instanceof Error ? e.message : dict.admin.posts.failed, "error");
    }
    setRenameModal(null);
  };

  const renamePreviewPath = useMemo(() => {
    if (!renameModal) return "";
    const slug = validateSlugInput(renameModal.slug);
    if (!slug) return "";
    const page = getPage(renameModal.id, renameModal.lang);
    if (!page) return "";
    const parentParts = getParentParts(page.path, renameModal.lang);
    return normalizePath(renameModal.lang, [...parentParts, slug]);
  }, [getPage, getParentParts, renameModal]);

  const renameSlugValid = renameModal ? validateSlugInput(renameModal.slug) !== null : true;

  const countDescendants = useCallback(
    (path: string, lang: string) =>
      pagesForLang(lang).filter((p) => p.path !== path && p.path.startsWith(`${path}/`)).length,
    [pagesForLang],
  );

  const submitDelete = async () => {
    if (!deleteModal) return;
    const res = await apiFetch(`/api/pages/${deleteModal.id}`, { method: "DELETE" });
    const body = (await res.json()) as { ok?: boolean; deletedIds?: string[]; message?: string; error?: string };
    if (!res.ok || !body.ok) {
      const msg =
        body.error === "SYSTEM_PAGE_PROTECTED"
          ? dict.admin.notes.systemProtected
          : (body.message ?? dict.admin.posts.deleteFailed);
      setStatus(msg, "error");
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
        if (!page || page.systemKey) return;
        setRenameModal({ id, lang, title: page.title, slug: page.slug });
      },
      onDelete: (id, lang) => {
        const page = getPage(id, lang);
        if (!page || page.systemKey) return;
        setDeleteModal({
          id,
          lang,
          title: page.title,
          childCount: countDescendants(page.path, lang),
        });
      },
      onTogglePublish: isNotes
        ? undefined
        : async (id, lang) => {
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
          const base =
            scope === "all"
              ? `/api/admin/pages?all=1${scopeQuery}`
              : `/api/admin/pages?lang=${encodeURIComponent(scope)}${scopeQuery}`;
          const res = await apiFetch(base);
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
                  scope: r.scope ?? (isNotes ? "NOTES" : "WIKI"),
                  systemKey: r.systemKey ?? null,
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
                scope: r.scope ?? (isNotes ? "NOTES" : "WIKI"),
                systemKey: r.systemKey ?? null,
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
    [
      countDescendants,
      dict.admin.posts,
      dict.admin.workbench,
      getPage,
      isNotes,
      liftUp,
      localizeAll,
      localizeBranch,
      movePageByDrop,
      patchPageApi,
      patchPageLocal,
      scopeQuery,
      setCreateModal,
      setCreateTitle,
      setDeleteModal,
      setPagesForLang,
      setRenameModal,
      setStatus,
      syncActivePathUrl,
      tabs,
    ],
  );

  return {
    explorerActions,
    submitCreate,
    submitRename,
    submitDelete,
    renamePreviewPath,
    renameSlugValid,
    pagesForLang,
  };
}
