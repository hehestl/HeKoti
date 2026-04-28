"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { buildPathTree, type PathTreeNode } from "@/lib/page-tree";
import { AdminMarkdownEditor } from "@/components/admin-markdown-editor";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";

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

export function AdminEditor({ initialPages, lang }: { initialPages: PageRow[]; lang: string }) {
  const [pages, setPages] = useState(initialPages);
  const [activeId, setActiveId] = useState(initialPages[0]?.id ?? "");
  const [status, setStatus] = useState("Idle");
  const [isPending, startTransition] = useTransition();
  const active = useMemo(() => pages.find((item) => item.id === activeId), [pages, activeId]);
  const pathTree = useMemo(() => buildPathTree(pages, lang), [pages, lang]);

  const updateActive = (patch: Partial<PageRow>) => {
    setPages((prev) => prev.map((item) => (item.id === activeId ? { ...item, ...patch } : item)));
  };

  const save = () => {
    if (!active) return;
    setStatus("Saved (optimistic)");
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
      setStatus(response.ok ? "Saved" : "Failed");
    });
  };

  const createWithParent = async (parentPathParts: string[]) => {
    const title = prompt("Заголовок страницы");
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
          <button onClick={createSibling} style={buttonStyle} type="button" title="Тот же уровень вложенности, что и выбранная страница">
            + Рядом
          </button>
          <button onClick={createChild} style={buttonStyle} type="button" title="Страница внутри выбранной (URL …/текущая/новая)" disabled={!active}>
            + Внутри
          </button>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
          Вложенность задаётся URL: <b>Внутри</b> — под выбранной статьёй; <b>Рядом</b> — сосед с той же «папкой». Список
          слева — дерево путей (как в проводнике).
        </p>
        <div
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
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Нет страниц — нажмите «Рядом».</p>
          ) : (
            <AdminPathTree nodes={pathTree} activeId={activeId} onSelect={setActiveId} />
          )}
        </div>
      </aside>
      <div style={panelStyle}>
        {!active ? (
          <p>No pages yet.</p>
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
                published
              </label>
              <button type="button" style={buttonStyle} onClick={save} disabled={isPending}>
                Save
              </button>
            </div>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>{status}</div>
            <AdminMarkdownEditor
              value={active.contentMd}
              onChange={(v) => updateActive({ contentMd: v })}
              lang={lang}
              wikiPages={pages.map((p) => ({ path: p.path, title: p.title }))}
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
}: {
  nodes: PathTreeNode<PageRow>[];
  activeId: string;
  onSelect: (id: string) => void;
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
}: {
  node: PathTreeNode<PageRow>;
  isLast: boolean;
  prefix: string;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const branch = isLast ? "└── " : "├── ";
  const childPrefix = prefix + (isLast ? "    " : "│   ");

  const labelRow: ReactNode = node.page ? (
    <button
      type="button"
      onClick={() => onSelect(node.page!.id)}
      title={node.page.path}
      style={{
        ...buttonStyle,
        flex: 1,
        minWidth: 0,
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "inherit",
        border: node.page.id === activeId ? "1px solid var(--accent)" : buttonStyle.border,
        background:
          node.page.id === activeId ? "color-mix(in srgb, var(--accent) 12%, var(--panel))" : buttonStyle.background,
        opacity: node.page.id === activeId ? 1 : 0.92,
      }}
    >
      <span style={{ marginRight: 6, opacity: 0.75 }} title={node.page.isPublished ? "Опубликовано" : "Черновик"}>
        {node.page.isPublished ? "●" : "○"}
      </span>
      {node.page.title}
    </button>
  ) : (
    <span
      style={{
        flex: 1,
        color: "var(--muted)",
        fontStyle: "italic",
        padding: "6px 8px",
        lineHeight: 1.35,
      }}
      title="Есть вложенные страницы, но страницы с этим точным URL нет"
    >
      {node.segment}/ <small style={{ opacity: 0.85 }}>— нет статьи</small>
    </span>
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
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
