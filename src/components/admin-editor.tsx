"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type PageRow = {
  id: string;
  title: string;
  path: string;
  contentMd: string;
  isPublished: boolean;
};

export function AdminEditor({ initialPages, lang }: { initialPages: PageRow[]; lang: string }) {
  const [pages, setPages] = useState(initialPages);
  const [activeId, setActiveId] = useState(initialPages[0]?.id ?? "");
  const [status, setStatus] = useState("Idle");
  const [isPending, startTransition] = useTransition();
  const active = useMemo(() => pages.find((item) => item.id === activeId), [pages, activeId]);

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

  const create = async () => {
    const title = prompt("Page title");
    if (!title) return;
    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang, title, contentMd: "", isPublished: false }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as PageRow;
    setPages((prev) => [data, ...prev]);
    setActiveId(data.id);
  };

  return (
    <section style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
      <aside style={panelStyle}>
        <button onClick={create} style={buttonStyle}>
          + Add
        </button>
        <ul style={{ marginTop: 12, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {pages.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveId(item.id)}
                style={{ ...buttonStyle, width: "100%", textAlign: "left", opacity: item.id === activeId ? 1 : 0.75 }}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
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
              <button style={buttonStyle} onClick={save} disabled={isPending}>
                Save
              </button>
            </div>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>{status}</div>
            <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
              <MonacoEditor
                language="markdown"
                value={active.contentMd}
                onChange={(value) => updateActive({ contentMd: value ?? "" })}
                height="60vh"
                options={{ minimap: { enabled: false }, fontSize: 14 }}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--panel)",
  padding: 12,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
};
