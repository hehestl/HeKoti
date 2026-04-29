"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { buildPathTree, type PathTreeNode } from "@/lib/page-tree";
import { AdminMarkdownEditor } from "@/components/admin-markdown-editor";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import type { Dictionary } from "@/lib/i18n";

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
  dict,
}: {
  initialPages: PageRow[];
  lang: string;
  dict: Dictionary;
}) {
  const [pages, setPages] = useState(initialPages);
  const [activeId, setActiveId] = useState(initialPages[0]?.id ?? "");
  const [status, setStatus] = useState(dict.admin.posts.idle);
  const [dragOver, setDragOver] = useState<null | { targetId: string; mode: "before" | "after" | "inside" }>(null);
  const [isPending, startTransition] = useTransition();
  const active = useMemo(() => pages.find((item) => item.id === activeId), [pages, activeId]);
  const pathTree = useMemo(() => buildPathTree(pages, lang), [pages, lang]);

  const updateActive = (patch: Partial<PageRow>) => {
    setPages((prev) => prev.map((item) => (item.id === activeId ? { ...item, ...patch } : item)));
  };

  const updatePage = (id: string, patch: Partial<PageRow>) => {
    setPages((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

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

  const patchPage = async (id: string, patch: { title?: string; contentMd?: string; isPublished?: boolean; navOrder?: number; parentPathParts?: string[] }) => {
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
  };

  const removePage = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    if (!confirm(dict.admin.posts.deleteConfirm.replace("{title}", page.title))) return;
    setStatus(dict.common.loading);
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE", credentials: "same-origin" });
    const body = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !body.ok) {
      setStatus(body.message ?? dict.admin.posts.deleteFailed);
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) {
      const next = pages.filter((p) => p.id !== id);
      setActiveId(next[0]?.id ?? "");
    }
    setStatus(dict.admin.posts.deleted);
  };

  const removeActive = async () => {
    if (!active) return;
    await removePage(active.id);
  };

  const renamePage = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const nextTitle = prompt(dict.admin.posts.renamePrompt, page.title);
    if (!nextTitle) return;
    updatePage(id, { title: nextTitle });
    try {
      await patchPage(id, { title: nextTitle });
      setStatus(dict.admin.posts.saved);
    } catch (e) {
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

  const getParentParts = (path: string) => {
    const segs = pathSegmentsAfterLang(path, lang);
    return segs.length <= 1 ? [] : segs.slice(0, -1);
  };

  const getSlug = (path: string) => {
    const segs = pathSegmentsAfterLang(path, lang);
    return segs[segs.length - 1] ?? "";
  };

  const hasChildren = (path: string) => pages.some((p) => p.path !== path && p.path.startsWith(`${path}/`));

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

  const createWithParent = async (parentPathParts: string[]) => {
    const title = prompt(dict.admin.posts.pageTitle);
    if (!title) return;
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang, title, contentMd: "", isPublished: false, parentPathParts }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as PageRow;
    setPages((prev) => [data, ...prev]);
    setActiveId(data.id);
  };

  const createSibling = async () => {
    if (!active) {
      await createWithParent([]);
      return;
    }
    const segs = pathSegmentsAfterLang(active.path, lang);
    const parentPathParts = segs.length <= 1 ? [] : segs.slice(0, -1);
    await createWithParent(parentPathParts);
  };

  const createChild = async () => {
    if (!active) {
      await createWithParent([]);
      return;
    }
    await createWithParent(pathSegmentsAfterLang(active.path, lang));
  };

  return (
    <section style={{ display: "grid", gridTemplateColumns: "minmax(300px, min(40vw, 420px)) 1fr", gap: 12 }}>
      <aside style={{ ...panelStyle, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button onClick={createSibling} style={buttonStyle} type="button" title={dict.admin.posts.siblingTitle}>
            {dict.admin.posts.addSibling}
          </button>
          <button onClick={createChild} style={buttonStyle} type="button" title={dict.admin.posts.childTitle} disabled={!active}>
            {dict.admin.posts.addChild}
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
              onRename={renamePage}
              onDelete={removePage}
              onTogglePublish={togglePublish}
              onMoveByDrop={movePageByDrop}
              dragOver={dragOver}
              setDragOver={setDragOver}
              dict={dict}
            />
          )}
        </div>
      </aside>
      <div style={panelStyle}>
        {!active ? (
          <p>{dict.admin.posts.noPages}</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={active.title}
                onChange={(event) => updateActive({ title: event.target.value })}
              />
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
            <div style={{ marginTop: 10, color: "var(--muted)" }}>{status}</div>
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
    </section>
  );
}

function AdminPathTree({
  nodes,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onTogglePublish,
  onMoveByDrop,
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
  dragOver: null | { targetId: string; mode: "before" | "after" | "inside" };
  setDragOver: (v: null | { targetId: string; mode: "before" | "after" | "inside" }) => void;
  dict: Dictionary;
}) {
  return (
    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}>
      {nodes.map((node, index) => (
        <PathTreeBranch
          key={node.pathKey}
          node={node}
          isLast={index === nodes.length - 1}
          prefix=""
          activeId={activeId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onTogglePublish={onTogglePublish}
          onMoveByDrop={onMoveByDrop}
          dragOver={dragOver}
          setDragOver={setDragOver}
          dict={dict}
        />
      ))}
    </div>
  );
}

function PathTreeBranch({
  node,
  isLast,
  prefix,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onTogglePublish,
  onMoveByDrop,
  dragOver,
  setDragOver,
  dict,
}: {
  node: PathTreeNode<PageRow>;
  isLast: boolean;
  prefix: string;
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onMoveByDrop: (fromId: string, targetId: string, mode: "before" | "after" | "inside") => void;
  dragOver: null | { targetId: string; mode: "before" | "after" | "inside" };
  setDragOver: (v: null | { targetId: string; mode: "before" | "after" | "inside" }) => void;
  dict: Dictionary;
}) {
  const branch = isLast ? "└── " : "├── ";
  const childPrefix = prefix + (isLast ? "    " : "│   ");

  const actionBtn: CSSProperties = {
    ...buttonStyle,
    padding: "0 8px",
    minHeight: 28,
    lineHeight: "28px",
  };

  const labelRow: ReactNode = node.page ? (
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
        alignItems: "stretch",
        gap: 6,
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
        padding: "0 6px",
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
          padding: "0 6px",
          cursor: "pointer",
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "28px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{ marginRight: 6, opacity: 0.75 }}
          title={node.page.isPublished ? dict.admin.posts.published : dict.admin.posts.draft}
        >
          {node.page.isPublished ? "●" : "○"}
        </span>
        {node.page.title}
      </button>
      <button type="button" style={actionBtn} onClick={() => onTogglePublish(node.page!.id)} title={dict.admin.posts.publishToggle}>
        {node.page.isPublished ? "⦿" : "○"}
      </button>
      <button type="button" style={actionBtn} onClick={() => onRename(node.page!.id)} title={dict.admin.posts.rename}>
        ✎
      </button>
      <button
        type="button"
        style={{ ...actionBtn, borderColor: "color-mix(in srgb, #ff5f7d 65%, var(--line))", color: "#ff5f7d" }}
        onClick={() => onDelete(node.page!.id)}
        title={dict.admin.posts.delete}
      >
        ⌫
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
          ...actionBtn,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          cursor: "grab",
        }}
        aria-label={dict.admin.posts.dragHint}
      >
        ⋮⋮
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
        opacity: 0.65,
        cursor: "default",
      }}
      title={dict.admin.posts.hasChildrenNoArticle}
    >
      <span style={{ marginRight: 6, opacity: 0.75 }}>○</span>
      {node.segment}/ <small style={{ opacity: 0.85 }}>— {dict.admin.posts.noArticle}</small>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 4, marginBottom: 3 }}>
        <span
          style={{
            color: "color-mix(in srgb, var(--muted) 85%, transparent)",
            whiteSpace: "pre",
            userSelect: "none",
            lineHeight: "28px",
          }}
        >
          {prefix}
          {branch}
        </span>
        {labelRow}
      </div>
      {node.children.length > 0 ? (
        <div>
          {node.children.map((child, ci) => (
            <PathTreeBranch
              key={child.pathKey}
              node={child}
              isLast={ci === node.children.length - 1}
              prefix={childPrefix}
              activeId={activeId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
              onMoveByDrop={onMoveByDrop}
              dragOver={dragOver}
              setDragOver={setDragOver}
              dict={dict}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
