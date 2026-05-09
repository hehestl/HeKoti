"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildPathTree, pathKeysWithChildren, type PathTreeNode } from "@/lib/page-tree";
import { AdminMarkdownEditor } from "@/components/admin-markdown-editor";
import {
  TREE_CHEVRON_BTN_SIZE,
  TreeChevronButton,
  TreeChevronSpacer,
  TreeDepthSpacer,
} from "@/components/page-tree-shared";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import type { Dictionary } from "@/lib/i18n";
import { Eye, EyeOff, GripVertical, MoreVertical } from "lucide-react";

const panelStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--panel)",
  padding: 12,
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

type PageRow = {
  id: string;
  title: string;
  path: string;
  contentMd: string;
  isPublished: boolean;
  navOrder: number;
};

export function AdminEditor({
  initialPages,
  lang,
  enabledLanguages,
  dict,
  initialActivePath,
}: {
  initialPages: PageRow[];
  lang: string;
  enabledLanguages: string[];
  dict: Dictionary;
  initialActivePath?: string;
}) {
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);
  const [activeId, setActiveId] = useState(() => {
    if (initialActivePath) {
      const hit = initialPages.find((p) => p.path === initialActivePath);
      if (hit) return hit.id;
    }
    return initialPages[0]?.id ?? "";
  });
  const [status, setStatus] = useState(dict.admin.posts.idle);
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [dragOver, setDragOver] = useState<null | { targetId: string; mode: "before" | "after" | "inside" }>(null);
  const [createParentParts, setCreateParentParts] = useState<string[] | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [renameModal, setRenameModal] = useState<{ id: string; title: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const active = useMemo(() => pages.find((item) => item.id === activeId), [pages, activeId]);
  const pathTree = useMemo(() => buildPathTree(pages, lang), [pages, lang]);

  const getParentParts = useCallback(
    (path: string) => {
      const segs = pathSegmentsAfterLang(path, lang);
      return segs.length <= 1 ? [] : segs.slice(0, -1);
    },
    [lang],
  );

  const hasChildren = useCallback(
    (path: string) => pages.some((p) => p.path !== path && p.path.startsWith(`${path}/`)),
    [pages],
  );

  const updateActive = (patch: Partial<PageRow>) => {
    setPages((prev) => prev.map((item) => (item.id === activeId ? { ...item, ...patch } : item)));
  };

  const updatePage = useCallback((id: string, patch: Partial<PageRow>) => {
    setPages((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const save = () => {
    if (!active) return;
    setStatus(dict.admin.posts.saving);
    startTransition(async () => {
      const response = await fetch(`/api/pages/${active.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: active.title,
          contentMd: active.contentMd,
          isPublished: active.isPublished,
        }),
      });
      setStatus(response.ok ? dict.admin.posts.saved : dict.admin.posts.failed);
    });
  };

  const patchPage = useCallback(
    async (id: string, patch: { title?: string; contentMd?: string; isPublished?: boolean; navOrder?: number; parentPathParts?: string[] }) => {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as PageRow & { ok?: boolean; message?: string };
      if (!res.ok) {
        throw new Error(body.message || "Update failed");
      }
      updatePage(id, body);
      return body;
    },
    [updatePage],
  );

  const cloneToLanguage = async (targetLang: string) => {
    if (!active) return;
    if (targetLang === lang) return;
    setStatus(dict.admin.posts.saving);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ sourcePath: active.path, targetLang }),
    });
    const body = (await res.json()) as { id?: string; path?: string; ok?: boolean; code?: string; existingPath?: string; message?: string };
    if (res.status === 409 && body.code === "exists" && body.existingPath) {
      router.push(`/${targetLang}/admin?tab=posts&activePath=${encodeURIComponent(body.existingPath)}`);
      return;
    }
    if (!res.ok || !body.path) {
      setStatus(body.message ?? dict.admin.posts.failed);
      return;
    }
    router.push(`/${targetLang}/admin?tab=posts&activePath=${encodeURIComponent(body.path)}`);
  };

  const removePage = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setStatus(dict.common.loading);
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE", credentials: "same-origin" });
    const body = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !body.ok) {
      setStatusTone("error");
      setStatus(body.message ?? dict.admin.posts.deleteFailed);
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) {
      const next = pages.filter((p) => p.id !== id);
      setActiveId(next[0]?.id ?? "");
    }
    setStatusTone("neutral");
    setStatus(dict.admin.posts.deleted);
  };

  const removeActive = async () => {
    if (!active) return;
    setDeleteModal({ id: active.id, title: active.title });
  };

  const requestDelete = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setDeleteModal({ id: page.id, title: page.title });
  };

  const requestRename = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setRenameModal({ id: page.id, title: page.title });
  };

  const renamePage = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const nextTitle = renameModal?.id === id ? renameModal.title.trim() : page.title;
    if (!nextTitle) return;
    updatePage(id, { title: nextTitle });
    try {
      await patchPage(id, { title: nextTitle });
      setStatusTone("neutral");
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      setStatusTone("error");
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed);
    }
  };

  const togglePublish = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const next = !page.isPublished;
    updatePage(id, { isPublished: next });
    try {
      await patchPage(id, { isPublished: next });
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      updatePage(id, { isPublished: page.isPublished });
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed);
    }
  };

  const getSlug = (path: string) => {
    const segs = pathSegmentsAfterLang(path, lang);
    return segs[segs.length - 1] ?? "";
  };

  const liftActiveUp = useCallback(async () => {
    if (!active) return;
    if (hasChildren(active.path)) {
      setStatus(dict.admin.posts.cantMoveWithChildren);
      return;
    }
    const parentParts = getParentParts(active.path);
    if (parentParts.length === 0) {
      setStatus(dict.admin.posts.cantMoveRoot);
      return;
    }
    const newParentParts = parentParts.slice(0, -1);
    const maxNav = pages
      .filter((p) => getParentParts(p.path).join("/") === newParentParts.join("/"))
      .reduce((m, p) => Math.max(m, p.navOrder), 0);
    setStatus(dict.admin.posts.saving);
    try {
      await patchPage(active.id, { parentPathParts: newParentParts, navOrder: maxNav + 10 });
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed);
    }
  }, [active, pages, dict.admin.posts, patchPage, getParentParts, hasChildren]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.altKey && e.shiftKey && e.key === "ArrowUp")) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      void liftActiveUp();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [liftActiveUp]);

  const movePageByDrop = async (fromId: string, targetId: string, mode: "before" | "after" | "inside") => {
    if (fromId === targetId) return;
    const from = pages.find((p) => p.id === fromId);
    const target = pages.find((p) => p.id === targetId);
    if (!from || !target) return;
    if (hasChildren(from.path)) {
      setStatus(dict.admin.posts.cantMoveWithChildren);
      return;
    }

    const targetParent = getParentParts(target.path);
    const targetInside = pathSegmentsAfterLang(target.path, lang);
    const newParentParts = mode === "inside" ? targetInside : targetParent;
    const fromSlug = getSlug(from.path);
    const nextPath = `/${lang}${newParentParts.length ? `/${newParentParts.join("/")}` : ""}/${fromSlug}`;

    const nextPages = [...pages];
    const fromIdx = nextPages.findIndex((p) => p.id === fromId);
    const moving = nextPages[fromIdx]!;
    nextPages.splice(fromIdx, 1);

    const siblingIds = nextPages
      .filter((p) => {
        const pp = getParentParts(p.path);
        return pp.join("/") === newParentParts.join("/");
      })
      .map((p) => p.id);

    const targetIndexInSiblings = siblingIds.indexOf(targetId);
    const insertAt =
      mode === "inside"
        ? siblingIds.length
        : targetIndexInSiblings >= 0
          ? mode === "before"
            ? targetIndexInSiblings
            : targetIndexInSiblings + 1
          : siblingIds.length;

    siblingIds.splice(insertAt, 0, fromId);

    const reorderedGroup = siblingIds
      .map((id) => (id === fromId ? { ...moving, path: nextPath } : nextPages.find((p) => p.id === id)!))
      .map((p, i) => ({ ...p, navOrder: i * 10 }));

    const kept = nextPages.filter((p) => !siblingIds.includes(p.id));
    const merged = [...kept, ...reorderedGroup];
    setPages(merged);
    setDragOver(null);
    setStatus(dict.admin.posts.saving);

    try {
      const ops = reorderedGroup.map((p) => {
        const patch: { navOrder: number; parentPathParts?: string[] } = { navOrder: p.navOrder };
        if (p.id === fromId) patch.parentPathParts = newParentParts;
        return patchPage(p.id, patch);
      });
      await Promise.all(ops);
      setStatus(dict.admin.posts.saved);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : dict.admin.posts.failed);
    }
  };

  const createWithParent = async (parentPathParts: string[], title: string) => {
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang, title, contentMd: "", isPublished: false, parentPathParts }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      setStatusTone("error");
      setStatus(body.message ?? dict.admin.posts.failed);
      return;
    }
    const data = (await response.json()) as PageRow;
    setPages((prev) => [data, ...prev]);
    setActiveId(data.id);
    setStatusTone("neutral");
    setStatus(dict.admin.posts.saved);
  };

  const openCreateModal = (parentPathParts: string[]) => {
    setCreateParentParts(parentPathParts);
    setCreateTitle("");
  };

  const queueCreateChild = useCallback((id: string) => {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    setCreateParentParts(pathSegmentsAfterLang(p.path, lang));
    setCreateTitle("");
  }, [pages, lang]);

  const queueCreateSibling = useCallback((id: string) => {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    const segs = pathSegmentsAfterLang(p.path, lang);
    setCreateParentParts(segs.length <= 1 ? [] : segs.slice(0, -1));
    setCreateTitle("");
  }, [pages, lang]);

  const createSibling = () => {
    if (!active) {
      openCreateModal([]);
      return;
    }
    const segs = pathSegmentsAfterLang(active.path, lang);
    const parentPathParts = segs.length <= 1 ? [] : segs.slice(0, -1);
    openCreateModal(parentPathParts);
  };

  const createChild = () => {
    if (!active) {
      openCreateModal([]);
      return;
    }
    openCreateModal(pathSegmentsAfterLang(active.path, lang));
  };

  const submitCreate = async () => {
    if (!createParentParts) return;
    const title = createTitle.trim();
    if (!title) return;
    await createWithParent(createParentParts, title);
    setCreateParentParts(null);
    setCreateTitle("");
  };

  const submitRename = async () => {
    if (!renameModal) return;
    await renamePage(renameModal.id);
    setRenameModal(null);
  };

  const submitDelete = async () => {
    if (!deleteModal) return;
    await removePage(deleteModal.id);
    setDeleteModal(null);
  };

  return (
    <section style={{ display: "grid", gridTemplateColumns: "minmax(300px, min(40vw, 420px)) 1fr", gap: 12 }}>
      <aside style={{ ...panelStyle, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {dict.admin.posts.sidebarTitle}
          </span>
          <button onClick={() => createSibling()} style={buttonStyle} type="button" title={dict.admin.posts.newPageTitle}>
            {dict.admin.posts.newPage}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <button onClick={createSibling} style={buttonStyle} type="button" title={dict.admin.posts.siblingTitle}>
            {dict.admin.posts.addSibling}
          </button>
          <button onClick={createChild} style={buttonStyle} type="button" title={dict.admin.posts.childTitle} disabled={!active}>
            {dict.admin.posts.addChild}
          </button>
          <button
            onClick={liftActiveUp}
            style={buttonStyle}
            type="button"
            title={dict.admin.posts.upLevelTitle}
            disabled={!active || getParentParts(active.path).length === 0}
          >
            {dict.admin.posts.upLevel}
          </button>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
          {dict.admin.posts.desc}
        </p>
        <div
          className="admin-path-tree-scroll"
          style={{
            marginTop: 12,
            maxHeight: "min(70vh, 720px)",
            overflow: "auto",
            padding: "8px 4px",
            borderRadius: 8,
            background: "color-mix(in srgb, var(--fg) 3%, transparent)",
          }}
        >
          {pathTree.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{dict.admin.posts.noPages}</p>
          ) : (
            <AdminPathTree
              nodes={pathTree}
              activeId={activeId}
              onSelect={setActiveId}
              onRename={requestRename}
              onDelete={requestDelete}
              onTogglePublish={togglePublish}
              onMoveByDrop={movePageByDrop}
              onAddChild={queueCreateChild}
              onAddSibling={queueCreateSibling}
              dragOver={dragOver}
              setDragOver={setDragOver}
              dict={dict}
            />
          )}
        </div>
      </aside>
      <div style={panelStyle}>
        {!active ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0 }}>{dict.admin.posts.noPages}</p>
            <button type="button" style={{ ...buttonStyle, justifySelf: "start" }} onClick={createSibling}>
              {dict.admin.posts.addSibling}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={active.title}
                onChange={(event) => updateActive({ title: event.target.value })}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {enabledLanguages.map((l) => {
                  const isCurrent = l === lang;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => cloneToLanguage(l)}
                      disabled={isCurrent || isPending}
                      title={isCurrent ? dict.admin.posts.cloneHereTitle : dict.admin.posts.cloneToTitle.replace("{lang}", l.toUpperCase())}
                      style={{
                        ...buttonStyle,
                        padding: "6px 10px",
                        minHeight: 30,
                        opacity: isCurrent ? 0.55 : 1,
                        cursor: isCurrent ? "default" : "pointer",
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={active.isPublished}
                  onChange={(event) => updateActive({ isPublished: event.target.checked })}
                />
                {dict.admin.posts.published}
              </label>
              <button
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: "color-mix(in srgb, #ff5f7d 65%, var(--line))",
                  color: "#ff5f7d",
                  fontWeight: 700,
                }}
                onClick={removeActive}
                disabled={isPending}
              >
                {dict.admin.posts.delete}
              </button>
              <button type="button" style={buttonStyle} onClick={save} disabled={isPending}>
                {dict.common.save}
              </button>
            </div>
            <div
              style={{
                marginTop: 10,
                color: statusTone === "error" ? "#ff5f7d" : "var(--muted)",
                border: `1px solid ${statusTone === "error" ? "color-mix(in srgb, #ff5f7d 65%, var(--line))" : "var(--line)"}`,
                background:
                  statusTone === "error"
                    ? "color-mix(in srgb, #ff5f7d 8%, transparent)"
                    : "color-mix(in srgb, var(--fg) 3%, transparent)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
              }}
            >
              {status}
            </div>
            <AdminMarkdownEditor
              value={active.contentMd}
              onChange={(v) => updateActive({ contentMd: v })}
              lang={lang}
              wikiPages={pages.map((p) => ({ path: p.path, title: p.title }))}
              dict={dict}
              height="60vh"
            />
          </>
        )}
      </div>
      {createParentParts ? (
        <ModalCard
          title={dict.admin.posts.pageTitle}
          cancelLabel={dict.common.cancel}
          onCancel={() => {
            setCreateParentParts(null);
            setCreateTitle("");
          }}
          onSubmit={() => void submitCreate()}
          submitLabel={dict.common.save}
          submitDisabled={!createTitle.trim()}
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
          <p style={{ margin: 0 }}>{dict.admin.posts.deleteConfirm.replace("{title}", deleteModal.title)}</p>
        </ModalCard>
      ) : null}
    </section>
  );
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
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 2000,
        padding: 12,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

const adminIconBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: TREE_CHEVRON_BTN_SIZE,
  minWidth: TREE_CHEVRON_BTN_SIZE,
  padding: 4,
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--fg)",
  cursor: "pointer",
};

const adminMenuBtn: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  color: "var(--fg)",
  cursor: "pointer",
  fontSize: 13,
  borderRadius: 6,
};

function AdminPathTree({
  nodes,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onTogglePublish,
  onMoveByDrop,
  onAddChild,
  onAddSibling,
  dragOver,
  setDragOver,
  dict,
}: {
  nodes: PathTreeNode<PageRow>[];
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onMoveByDrop: (fromId: string, targetId: string, mode: "before" | "after" | "inside") => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  dragOver: null | { targetId: string; mode: "before" | "after" | "inside" };
  setDragOver: (v: null | { targetId: string; mode: "before" | "after" | "inside" }) => void;
  dict: Dictionary;
}) {
  const [openBranches, setOpenBranches] = useState(() => pathKeysWithChildren(nodes));
  const [rowMenu, setRowMenu] = useState<null | { id: string; x: number; y: number }>(null);

  useEffect(() => {
    if (!rowMenu) return;
    const close = () => setRowMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [rowMenu]);

  const toggleBranch = useCallback((pathKey: string) => {
    setOpenBranches((prev) => {
      const n = new Set(prev);
      if (n.has(pathKey)) n.delete(pathKey);
      else n.add(pathKey);
      return n;
    });
  }, []);

  return (
    <div style={{ fontSize: 13, fontFamily: "inherit" }}>
      {nodes.map((node) => (
        <AdminTreeBranch
          key={node.pathKey}
          node={node}
          depth={0}
          activeId={activeId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onTogglePublish={onTogglePublish}
          onMoveByDrop={onMoveByDrop}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          dragOver={dragOver}
          setDragOver={setDragOver}
          dict={dict}
          openBranches={openBranches}
          toggleBranch={toggleBranch}
          setRowMenu={setRowMenu}
          adminIconBtnStyle={adminIconBtn}
        />
      ))}
      {rowMenu ? (
        <RowActionsMenu
          menu={rowMenu}
          dict={dict}
          adminMenuBtnStyle={adminMenuBtn}
          onRename={onRename}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          close={() => setRowMenu(null)}
        />
      ) : null}
    </div>
  );
}

function RowActionsMenu({
  menu,
  dict,
  adminMenuBtnStyle,
  onRename,
  onDelete,
  onAddChild,
  onAddSibling,
  close,
}: {
  menu: { id: string; x: number; y: number };
  dict: Dictionary;
  adminMenuBtnStyle: CSSProperties;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  close: () => void;
}) {
  return (
    <div
      role="menu"
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        zIndex: 2100,
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        minWidth: 188,
        padding: 4,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        style={adminMenuBtnStyle}
        onClick={() => {
          onAddSibling(menu.id);
          close();
        }}
      >
        {dict.admin.posts.addSibling}
      </button>
      <button
        type="button"
        style={adminMenuBtnStyle}
        onClick={() => {
          onAddChild(menu.id);
          close();
        }}
      >
        {dict.admin.posts.addChild}
      </button>
      <button
        type="button"
        style={adminMenuBtnStyle}
        onClick={() => {
          onRename(menu.id);
          close();
        }}
      >
        {dict.admin.posts.rename}
      </button>
      <button
        type="button"
        style={{ ...adminMenuBtnStyle, color: "#ff5f7d" }}
        onClick={() => {
          onDelete(menu.id);
          close();
        }}
      >
        {dict.admin.posts.delete}
      </button>
    </div>
  );
}

function AdminTreeBranch({
  node,
  depth,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onTogglePublish,
  onMoveByDrop,
  onAddChild,
  onAddSibling,
  dragOver,
  setDragOver,
  dict,
  openBranches,
  toggleBranch,
  setRowMenu,
  adminIconBtnStyle,
}: {
  node: PathTreeNode<PageRow>;
  depth: number;
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onMoveByDrop: (fromId: string, targetId: string, mode: "before" | "after" | "inside") => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  dragOver: null | { targetId: string; mode: "before" | "after" | "inside" };
  setDragOver: (v: null | { targetId: string; mode: "before" | "after" | "inside" }) => void;
  dict: Dictionary;
  openBranches: Set<string>;
  toggleBranch: (pathKey: string) => void;
  setRowMenu: (v: null | { id: string; x: number; y: number }) => void;
  adminIconBtnStyle: CSSProperties;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = !hasChildren || openBranches.has(node.pathKey);

  const dragTargetId = node.page?.id ?? null;

  const labelRow: ReactNode =
    dragTargetId && node.page ? (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId || fromId === node.page!.id) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const mode = e.shiftKey ? "inside" : y < rect.height / 2 ? "before" : "after";
          setDragOver({ targetId: node.page!.id, mode });
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("text/plain");
          if (!fromId) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const mode = e.shiftKey ? "inside" : y < rect.height / 2 ? "before" : "after";
          onMoveByDrop(fromId, node.page!.id, mode);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          flex: 1,
          minWidth: 0,
          borderRadius: 8,
          border:
            node.page.id === activeId
              ? "1px solid var(--accent)"
              : dragOver?.targetId === node.page.id
                ? `1px solid ${dragOver.mode === "inside" ? "color-mix(in srgb, var(--accent) 70%, var(--line))" : "color-mix(in srgb, var(--accent) 45%, var(--line))"}`
                : "1px solid var(--line)",
          background:
            node.page.id === activeId
              ? "color-mix(in srgb, var(--accent) 12%, var(--panel))"
              : dragOver?.targetId === node.page.id
                ? "color-mix(in srgb, var(--accent) 10%, var(--panel))"
                : "transparent",
          padding: "2px 4px",
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(node.page!.id)}
          title={node.page.path}
          style={{
            border: "none",
            background: "transparent",
            color: "inherit",
            padding: "2px 4px",
            cursor: "pointer",
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {node.page.isPublished ? (
            <Eye size={15} aria-hidden strokeWidth={2} style={{ opacity: 0.8, flexShrink: 0 }} />
          ) : (
            <EyeOff size={15} aria-hidden strokeWidth={2} style={{ opacity: 0.55, flexShrink: 0 }} />
          )}
          <span title={node.page.isPublished ? dict.admin.posts.published : dict.admin.posts.draft}>{node.page.title}</span>
        </button>
        <button
          type="button"
          style={adminIconBtnStyle}
          onClick={() => onTogglePublish(node.page!.id)}
          title={dict.admin.posts.publishToggle}
          aria-label={dict.admin.posts.publishToggle}
        >
          {node.page.isPublished ? <Eye size={16} strokeWidth={2} /> : <EyeOff size={16} strokeWidth={2} />}
        </button>
        <button
          type="button"
          style={adminIconBtnStyle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const id = node.page!.id;
            queueMicrotask(() => setRowMenu({ id, x: r.left, y: r.bottom + 4 }));
          }}
          title={dict.admin.posts.rowMenuTitle}
          aria-label={dict.admin.posts.rowMenuTitle}
        >
          <MoreVertical size={16} strokeWidth={2} />
        </button>
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", node.page!.id);
          }}
          onDragEnd={() => setDragOver(null)}
          title={dict.admin.posts.dragHint}
          style={{
            ...adminIconBtnStyle,
            cursor: "grab",
            userSelect: "none",
          }}
          aria-label={dict.admin.posts.dragHint}
        >
          <GripVertical size={16} strokeWidth={2} />
        </span>
      </div>
    ) : (
      <div
        style={{
          ...buttonStyle,
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          fontFamily: "inherit",
          fontSize: "inherit",
          background: "transparent",
          opacity: 0.75,
          cursor: "default",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 6px",
        }}
        title={dict.admin.posts.hasChildrenNoArticle}
      >
        <span style={{ opacity: 0.75, fontSize: 12 }}>{node.segment}/</span>
        <small style={{ opacity: 0.85 }}>{dict.admin.posts.noArticle}</small>
      </div>
    );

  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, minHeight: TREE_CHEVRON_BTN_SIZE }}>
        <TreeDepthSpacer depth={depth} />
        {hasChildren ? (
          <TreeChevronButton
            expanded={expanded}
            onToggle={() => toggleBranch(node.pathKey)}
            ariaLabel={expanded ? dict.admin.wiki.treeCollapseBranch : dict.admin.wiki.treeExpandBranch}
          />
        ) : (
          <TreeChevronSpacer />
        )}
        {labelRow}
      </div>
      {hasChildren && expanded ? (
        <div>
          {node.children.map((child) => (
            <AdminTreeBranch
              key={child.pathKey}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
              onMoveByDrop={onMoveByDrop}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              dragOver={dragOver}
              setDragOver={setDragOver}
              dict={dict}
              openBranches={openBranches}
              toggleBranch={toggleBranch}
              setRowMenu={setRowMenu}
              adminIconBtnStyle={adminIconBtnStyle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
