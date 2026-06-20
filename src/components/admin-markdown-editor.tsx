"use client";

import "@/lib/monaco-workers-env";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type * as monaco from "monaco-editor";
import {
  insertAtCursor,
  insertSnippetBlock,
  setBlockTypeAtLine,
  setHeadingLevel,
  toggleLinePrefix,
  wrapSelection,
} from "@/lib/monaco-md-helpers";
import { resolvePostWikiTarget } from "@/lib/wiki-link-expand";
import type { Dictionary } from "@/lib/i18n";
import { AdminBlockMenu, type BlockMenuType } from "@/components/admin-block-menu";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import type { AdminContextMenuItem } from "@/types/admin-workbench";
const MonacoEditor = dynamic(() => import("@/components/admin-monaco"), { ssr: false });

const tbBtn: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  background: "var(--panel)",
  color: "var(--fg)",
  cursor: "pointer",
};

type WikiRef = { path: string; title: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  lang: string;
  wikiPages: WikiRef[];
  dict: Dictionary;
  height?: string;
};

type LinkModalState =
  | { mode: "post"; slug: string; error: string }
  | { mode: "wiki"; slug: string; label: string; error: string }
  | { mode: "url"; url: string; label: string; error: string };

export function AdminMarkdownEditor({ value, onChange, lang, wikiPages, dict, height = "60vh" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const edRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monRef = useRef<typeof monaco | null>(null);
  const skipChangeRef = useRef(false);
  const blockLineRef = useRef(1);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [blockMenu, setBlockMenu] = useState<{ x: number; y: number; line: number } | null>(null);
  const [linkModal, setLinkModal] = useState<LinkModalState | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState(120);
  const { resolvedTheme } = useTheme();
  const fillParent = height === "100%";
  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "vs";

  useEffect(() => {
    if (!fillParent) return;
    const host = hostRef.current;
    if (!host) return;

    const syncHeight = () => {
      const next = host.clientHeight;
      if (next > 0) setMeasuredHeight(next);
      edRef.current?.layout();
    };

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(host);
    return () => ro.disconnect();
  }, [fillParent]);

  useEffect(() => {
    edRef.current?.layout();
  }, [measuredHeight]);

  useEffect(() => {
    const ed = edRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model || model.getValue() === value) return;
    skipChangeRef.current = true;
    const scrollTop = ed.getScrollTop();
    const pos = ed.getPosition();
    ed.setValue(value);
    ed.setScrollTop(scrollTop);
    if (pos) ed.setPosition(pos);
    skipChangeRef.current = false;
  }, [value]);

  const closeCtx = useCallback(() => setCtx(null), []);
  const closeBlockMenu = useCallback(() => setBlockMenu(null), []);

  const withEd = useCallback((fn: (ed: monaco.editor.IStandaloneCodeEditor, m: typeof monaco) => void) => {
    const ed = edRef.current;
    const m = monRef.current;
    if (ed && m) fn(ed, m);
  }, []);

  const openBlockMenu = useCallback((line: number, x: number, y: number) => {
    blockLineRef.current = line;
    setCtx(null);
    setBlockMenu({ x, y, line });
  }, []);

  const applyBlockType = useCallback(
    (type: BlockMenuType) => {
      withEd((ed, m) => setBlockTypeAtLine(ed, m, blockLineRef.current, type));
      closeBlockMenu();
    },
    [closeBlockMenu, withEd],
  );

  const monacoOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: "on" as const,
      scrollBeyondLastLine: false,
      contextmenu: false,
      automaticLayout: true,
      lineNumbersMinChars: 3,
      lineNumbers: (lineNumber: number) => `${lineNumber} +`,
    }),
    [],
  );

  const handleMonacoMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, m: typeof monaco) => {
      edRef.current = editor;
      monRef.current = m;
      if (editor.getValue() !== value) {
        skipChangeRef.current = true;
        editor.setValue(value);
        skipChangeRef.current = false;
      }
      requestAnimationFrame(() => editor.layout());
      editor.onContextMenu((e) => {
        e.event.preventDefault();
        e.event.stopPropagation();
        setBlockMenu(null);
        setCtx({ x: e.event.browserEvent.clientX, y: e.event.browserEvent.clientY });
      });
      editor.onMouseDown((e) => {
        if (e.target.type !== m.editor.MouseTargetType.GUTTER_LINE_NUMBERS || !e.target.position) return;
        e.event.preventDefault();
        e.event.stopPropagation();
        openBlockMenu(
          e.target.position.lineNumber,
          e.event.browserEvent.clientX,
          e.event.browserEvent.clientY,
        );
      });
      editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Period, () => {
        const pos = editor.getPosition();
        if (!pos) return;
        const coords = editor.getScrolledVisiblePosition(pos);
        const host = hostRef.current?.getBoundingClientRect();
        if (!coords || !host) return;
        openBlockMenu(pos.lineNumber, host.left + coords.left, host.top + coords.top);
      });
      editor.addCommand(m.KeyMod.Alt | m.KeyMod.Shift | m.KeyCode.KeyB, () => {
        const pos = editor.getPosition();
        if (!pos) return;
        const coords = editor.getScrolledVisiblePosition(pos);
        const host = hostRef.current?.getBoundingClientRect();
        if (!coords || !host) return;
        openBlockMenu(pos.lineNumber, host.left + coords.left, host.top + coords.top);
      });
    },
    [openBlockMenu, value],
  );

  const insertWikiPost = useCallback(() => {
    setLinkModal({ mode: "post", slug: "h2", error: "" });
  }, []);

  const insertWikiLink = useCallback(() => {
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      const label = model.getValueInRange(sel) || dict.admin.editor.linkPlaceholder;
      setLinkModal({ mode: "wiki", slug: "h2", label, error: "" });
    });
  }, [withEd, dict.admin.editor.linkPlaceholder]);

  const insertExternalLink = useCallback(() => {
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      const label = model.getValueInRange(sel) || dict.admin.editor.externalLinkPlaceholder;
      setLinkModal({ mode: "url", url: "https://", label, error: "" });
    });
  }, [withEd, dict]);

  const submitLinkModal = useCallback(() => {
    if (!linkModal) return;
    if (linkModal.mode === "post") {
      const slug = linkModal.slug.trim().replace(/^\//, "");
      if (!slug) {
        setLinkModal({ ...linkModal, error: dict.admin.editor.linkPrompt });
        return;
      }
      withEd((ed, m) => insertAtCursor(ed, m, `/post ${slug} `));
      setLinkModal(null);
      return;
    }
    if (linkModal.mode === "wiki") {
      const slug = linkModal.slug.trim();
      if (!slug) {
        setLinkModal({ ...linkModal, error: dict.admin.editor.linkPrompt });
        return;
      }
      const hit = resolvePostWikiTarget(slug, lang, wikiPages);
      if (!hit) {
        setLinkModal({ ...linkModal, error: dict.admin.editor.linkNotFound.replace("{slug}", slug) });
        return;
      }
      withEd((ed) => {
        const model = ed.getModel();
        const sel = ed.getSelection();
        if (!model || !sel) return;
        ed.executeEdits("link", [{ range: sel, text: `[${linkModal.label}](${hit.href})`, forceMoveMarkers: true }]);
        ed.focus();
      });
      setLinkModal(null);
      return;
    }
    const url = linkModal.url.trim();
    if (!url) {
      setLinkModal({ ...linkModal, error: dict.admin.editor.externalLinkPrompt });
      return;
    }
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      ed.executeEdits("elink", [{ range: sel, text: `[${linkModal.label}](${url})`, forceMoveMarkers: true }]);
      ed.focus();
    });
    setLinkModal(null);
  }, [dict.admin.editor, lang, linkModal, wikiPages, withEd]);

  const insertDateTime = useCallback(() => {
    withEd((ed, m) =>
      insertAtCursor(
        ed,
        m,
        new Date().toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }),
      ),
    );
  }, [withEd, lang]);

  const actions = useMemo(
    () =>
      ({
        bold: () => withEd((ed, m) => wrapSelection(ed, m, "**", "**")),
        italic: () => withEd((ed, m) => wrapSelection(ed, m, "*", "*")),
        strike: () => withEd((ed, m) => wrapSelection(ed, m, "~~", "~~")),
        underline: () => withEd((ed, m) => wrapSelection(ed, m, "<u>", "</u>")),
        h2: () => withEd((ed, m) => setHeadingLevel(ed, m, 2)),
        h3: () => withEd((ed, m) => setHeadingLevel(ed, m, 3)),
        h4: () => withEd((ed, m) => setHeadingLevel(ed, m, 4)),
        bullet: () => withEd((ed, m) => toggleLinePrefix(ed, m, "- ")),
        quote: () => withEd((ed, m) => toggleLinePrefix(ed, m, "> ")),
        code: () => withEd((ed, m) => wrapSelection(ed, m, "`", "`")),
        codeBlock: () => withEd((ed, m) => wrapSelection(ed, m, "```\n", "\n```")),
        hr: () => withEd((ed, m) => insertSnippetBlock(ed, m, "---")),
        table: () =>
          withEd((ed, m) =>
            insertSnippetBlock(ed, m, "| Header 1 | Header 2 |\n| --- | --- |\n|  |  |\n|  |  |"),
          ),
        details: () =>
          withEd((ed, m) =>
            insertSnippetBlock(
              ed,
              m,
              "<details>\n<summary>Details</summary>\n\nContent goes here.\n\n</details>",
            ),
          ),
        callout: () => withEd((ed, m) => insertSnippetBlock(ed, m, "> **Important:** content here.")),
        formula: () => withEd((ed, m) => insertSnippetBlock(ed, m, "$$\nE = mc^2\n$$")),
      }) as Record<string, () => void>,
    [withEd],
  );

  const contextMenuItems = useMemo((): AdminContextMenuItem[] => {
    const cm = dict.admin.editor.contextMenu;
    const run = (key: string) => {
      actions[key]?.();
      setCtx(null);
    };
    return [
      { id: "bold", label: cm.bold, onClick: () => run("bold") },
      { id: "italic", label: cm.italic, onClick: () => run("italic") },
      { id: "underline", label: cm.underline, onClick: () => run("underline") },
      { id: "strike", label: cm.strike, onClick: () => run("strike") },
      { id: "sep1", label: "", separator: true },
      { id: "h2", label: "H2", onClick: () => run("h2") },
      { id: "h3", label: "H3", onClick: () => run("h3") },
      { id: "h4", label: "H4", onClick: () => run("h4") },
      { id: "sep2", label: "", separator: true },
      { id: "code", label: cm.code, onClick: () => run("code") },
      { id: "codeBlock", label: dict.admin.editor.codeBlock, onClick: () => run("codeBlock") },
      { id: "bullet", label: cm.bullet, onClick: () => run("bullet") },
      { id: "quote", label: cm.quote, onClick: () => run("quote") },
      { id: "hr", label: cm.hr, onClick: () => run("hr") },
      { id: "table", label: cm.table, onClick: () => run("table") },
      { id: "details", label: cm.details, onClick: () => run("details") },
      { id: "callout", label: cm.callout, onClick: () => run("callout") },
      { id: "formula", label: cm.formula, onClick: () => run("formula") },
      { id: "sep3", label: "", separator: true },
      { id: "wiki", label: cm.wikiLink, onClick: () => { insertWikiLink(); setCtx(null); } },
      { id: "ext", label: cm.externalLink, onClick: () => { insertExternalLink(); setCtx(null); } },
      { id: "post", label: cm.insertPost, onClick: () => { insertWikiPost(); setCtx(null); } },
      { id: "date", label: cm.insertDateTime, onClick: () => { insertDateTime(); setCtx(null); } },
    ];
  }, [actions, dict.admin.editor, insertDateTime, insertExternalLink, insertWikiLink, insertWikiPost]);

  const monacoHeight = fillParent ? measuredHeight : height;

  return (
    <div
      className={`admin-monaco-wrap${fillParent ? " admin-monaco-wrap-fill" : ""}`}
      style={fillParent ? { minHeight: 120 } : { height, minHeight: 120 }}
    >
      <div className="admin-monaco-editor-host" ref={hostRef}>
        <MonacoEditor
          height={monacoHeight}
          language="markdown"
          theme={monacoTheme}
          value={value}
          onChange={(v) => {
            if (skipChangeRef.current) return;
            onChange(v ?? "");
          }}
          onMount={handleMonacoMount}
          options={monacoOptions}
        />
      </div>
      {ctx ? (
        <AdminContextMenu
          x={ctx.x}
          y={ctx.y}
          items={contextMenuItems}
          onClose={closeCtx}
          dismissOnScroll={false}
        />
      ) : null}
      {blockMenu ? (
        <AdminBlockMenu
          x={blockMenu.x}
          y={blockMenu.y}
          labels={{
            filterPlaceholder: dict.admin.editor.blockMenuFilter,
            close: dict.admin.editor.blockMenuClose,
          }}
          onPick={applyBlockType}
          onClose={closeBlockMenu}
        />
      ) : null}
      {linkModal ? (
        <div
          role="dialog"
          aria-modal
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 11000,
            padding: 12,
          }}
          onClick={() => setLinkModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {linkModal.mode === "post"
                ? dict.admin.editor.postTitle
                : linkModal.mode === "wiki"
                  ? dict.admin.editor.wikiTitle
                  : dict.admin.editor.urlTitle}
            </h3>
            {linkModal.mode === "post" ? (
              <input
                style={inputStyle}
                autoFocus
                value={linkModal.slug}
                onChange={(e) => setLinkModal({ ...linkModal, slug: e.target.value, error: "" })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitLinkModal();
                }}
              />
            ) : (
              <>
                <input
                  style={inputStyle}
                  autoFocus
                  value={linkModal.mode === "wiki" ? linkModal.slug : linkModal.url}
                  onChange={(e) =>
                    setLinkModal(
                      linkModal.mode === "wiki"
                        ? { ...linkModal, slug: e.target.value, error: "" }
                        : { ...linkModal, url: e.target.value, error: "" },
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitLinkModal();
                  }}
                />
                <input
                  style={inputStyle}
                  value={linkModal.label}
                  onChange={(e) => setLinkModal({ ...linkModal, label: e.target.value, error: "" })}
                />
              </>
            )}
            {linkModal.error ? <p style={{ margin: 0, color: "#ff5f7d", fontSize: 13 }}>{linkModal.error}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={tbBtn} onClick={() => setLinkModal(null)}>
                {dict.common.cancel}
              </button>
              <button type="button" style={{ ...tbBtn, background: "var(--accent)", color: "#fff" }} onClick={submitLinkModal}>
                {dict.common.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "8px 10px",
  width: "100%",
};
