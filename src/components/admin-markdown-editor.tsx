"use client";

import "@/lib/monaco-workers-env";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type * as monaco from "monaco-editor";
import {
  insertAtCursor,
  insertEmptyLineAfter,
  insertSnippetBlock,
  setBlockTypeAtLine,
  setHeadingLevel,
  toggleLinePrefix,
  wrapSelection,
} from "@/lib/monaco-md-helpers";
import { CALLOUT_TYPES, insertCalloutSnippet } from "@/lib/markdown-callouts";
import type { Dictionary } from "@/lib/i18n";
import { AdminBlockMenu, type BlockMenuType } from "@/components/admin-block-menu";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import { AdminMediaModal } from "@/components/admin-media-modal";
import {
  AdminWikiLinkPicker,
  type AdminWikiLinkFormat,
} from "@/components/admin-wiki-link-picker";
import type { AdminWikiPageSearchItem } from "@/hooks/use-admin-wiki-page-search";
import { DIAGRAM_TEMPLATES, type DiagramTemplateKey } from "@/lib/diagram-templates";
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
  | { mode: "page"; format: AdminWikiLinkFormat; label: string }
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
  const [mediaModal, setMediaModal] = useState<"image" | "video" | null>(null);
  const [diagramMenuOpen, setDiagramMenuOpen] = useState(false);
  const [gutterPlus, setGutterPlus] = useState<null | { line: number; top: number; left: number }>(null);
  const diagramMenuRef = useRef<HTMLDivElement | null>(null);
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

  const monacoOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: "on" as const,
      scrollBeyondLastLine: false,
      contextmenu: false,
      automaticLayout: true,
      lineNumbersMinChars: 3,
      lineNumbers: "on" as const,
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
        setGutterPlus(null);
        setCtx({ x: e.event.browserEvent.clientX, y: e.event.browserEvent.clientY });
      });
      editor.onMouseMove((e) => {
        if (e.target.type !== m.editor.MouseTargetType.GUTTER_LINE_NUMBERS || !e.target.position) {
          setGutterPlus(null);
          return;
        }
        const line = e.target.position.lineNumber;
        const coords = editor.getScrolledVisiblePosition({ lineNumber: line, column: 1 });
        const host = hostRef.current?.getBoundingClientRect();
        if (!coords || !host) {
          setGutterPlus(null);
          return;
        }
        setGutterPlus({
          line,
          top: host.top + coords.top + coords.height / 2,
          left: e.event.browserEvent.clientX + 14,
        });
      });
      editor.onMouseDown((e) => {
        if (e.target.type !== m.editor.MouseTargetType.GUTTER_LINE_NUMBERS || !e.target.position) return;
        e.event.preventDefault();
        e.event.stopPropagation();
        insertEmptyLineAfter(editor, m, e.target.position.lineNumber);
        setGutterPlus(null);
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

  const insertPageLink = useCallback(() => {
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      const label = model.getValueInRange(sel) || dict.admin.editor.linkPlaceholder;
      setLinkModal({ mode: "page", format: "markdown", label });
    });
  }, [withEd, dict.admin.editor.linkPlaceholder]);

  const applyBlockType = useCallback(
    (type: BlockMenuType) => {
      if (type === "quote") {
        withEd((ed, m) => toggleLinePrefix(ed, m, "> "));
        closeBlockMenu();
        return;
      }
      if (type === "code") {
        withEd((ed, m) => wrapSelection(ed, m, "`", "`"));
        closeBlockMenu();
        return;
      }
      if (type === "table") {
        withEd((ed, m) =>
          insertSnippetBlock(ed, m, "| Header 1 | Header 2 |\n| --- | --- |\n|  |  |\n|  |  |"),
        );
        closeBlockMenu();
        return;
      }
      if (type === "details") {
        withEd((ed, m) =>
          insertSnippetBlock(
            ed,
            m,
            "<details>\n<summary>Details</summary>\n\nContent goes here.\n\n</details>",
          ),
        );
        closeBlockMenu();
        return;
      }
      if (type === "pageLink") {
        insertPageLink();
        closeBlockMenu();
        return;
      }
      withEd((ed, m) => setBlockTypeAtLine(ed, m, blockLineRef.current, type as import("@/lib/monaco-md-helpers").BlockLineType));
      closeBlockMenu();
    },
    [closeBlockMenu, insertPageLink, withEd],
  );

  const insertExternalLink = useCallback(() => {
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      const label = model.getValueInRange(sel) || dict.admin.editor.externalLinkPlaceholder;
      setLinkModal({ mode: "url", url: "https://", label, error: "" });
    });
  }, [withEd, dict]);

  const insertPageLinkFromPicker = useCallback(
    (item: AdminWikiPageSearchItem, format: AdminWikiLinkFormat, linkLabel: string) => {
      withEd((ed, m) => {
        const model = ed.getModel();
        const sel = ed.getSelection();
        if (!model || !sel) return;
        const text =
          format === "post"
            ? `/post ${item.pathTail} `
            : `[${linkLabel.trim() || item.title}](${item.href})`;
        if (sel.isEmpty()) {
          insertAtCursor(ed, m, text);
        } else {
          ed.executeEdits("link", [{ range: sel, text, forceMoveMarkers: true }]);
          ed.focus();
        }
      });
      setLinkModal(null);
    },
    [withEd],
  );

  const submitLinkModal = useCallback(() => {
    if (!linkModal || linkModal.mode !== "url") return;
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
  }, [dict.admin.editor.externalLinkPrompt, linkModal, withEd]);

  const insertMediaSnippet = useCallback(
    (snippet: string) => {
      withEd((ed, m) => insertSnippetBlock(ed, m, snippet));
    },
    [withEd],
  );

  const insertDiagramTemplate = useCallback(
    (key: DiagramTemplateKey) => {
      insertMediaSnippet(DIAGRAM_TEMPLATES[key]);
      setDiagramMenuOpen(false);
    },
    [insertMediaSnippet],
  );

  useEffect(() => {
    if (!diagramMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!diagramMenuRef.current?.contains(e.target as Node)) setDiagramMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [diagramMenuOpen]);

  const openImageModal = useCallback(() => setMediaModal("image"), []);
  const openVideoModal = useCallback(() => setMediaModal("video"), []);

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
        numbered: () => withEd((ed, m) => toggleLinePrefix(ed, m, "1. ")),
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
        pageLink: () => insertPageLink(),
        formula: () => withEd((ed, m) => insertSnippetBlock(ed, m, "$$\nE = mc^2\n$$")),
        ...Object.fromEntries(
          CALLOUT_TYPES.map((type) => [
            `callout_${type}`,
            () => withEd((ed, m) => insertSnippetBlock(ed, m, insertCalloutSnippet(type))),
          ]),
        ),
      }) as Record<string, () => void>,
    [insertPageLink, withEd],
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
      { id: "numbered", label: cm.numbered, onClick: () => run("numbered") },
      { id: "quote", label: cm.quote, onClick: () => run("quote") },
      { id: "hr", label: cm.hr, onClick: () => run("hr") },
      { id: "table", label: cm.table, onClick: () => run("table") },
      { id: "details", label: cm.details, onClick: () => run("details") },
      ...CALLOUT_TYPES.map((type) => ({
        id: `callout-${type}`,
        label: `${cm.callout} ${type}`,
        onClick: () => run(`callout_${type}`),
      })),
      { id: "formula", label: cm.formula, onClick: () => run("formula") },
      { id: "sep3", label: "", separator: true },
      { id: "image", label: cm.insertImage, onClick: () => { openImageModal(); setCtx(null); } },
      { id: "video", label: cm.insertVideo, onClick: () => { openVideoModal(); setCtx(null); } },
      { id: "sep4", label: "", separator: true },
      { id: "pageLink", label: cm.pageLink, onClick: () => { insertPageLink(); setCtx(null); } },
      { id: "ext", label: cm.externalLink, onClick: () => { insertExternalLink(); setCtx(null); } },
      { id: "date", label: cm.insertDateTime, onClick: () => { insertDateTime(); setCtx(null); } },
    ];
  }, [actions, dict.admin.editor, insertDateTime, insertExternalLink, insertPageLink, openImageModal, openVideoModal]);

  const monacoHeight = fillParent ? measuredHeight : height;

  return (
    <div
      className={`admin-monaco-wrap${fillParent ? " admin-monaco-wrap-fill" : ""}`}
      style={fillParent ? { minHeight: 120 } : { height, minHeight: 120 }}
    >
      <div className="admin-markdown-editor-toolbar">
        <button type="button" style={tbBtn} title={dict.admin.editor.media.imageTitle} onClick={openImageModal}>
          {dict.admin.editor.media.imageBtn}
        </button>
        <button type="button" style={tbBtn} title={dict.admin.editor.media.videoTitle} onClick={openVideoModal}>
          {dict.admin.editor.media.videoBtn}
        </button>
        <div className="admin-diagram-menu-wrap" ref={diagramMenuRef}>
          <button
            type="button"
            style={tbBtn}
            title={dict.admin.editor.diagramTitle}
            aria-expanded={diagramMenuOpen}
            onClick={() => setDiagramMenuOpen((v) => !v)}
          >
            {dict.admin.editor.diagram}
          </button>
          {diagramMenuOpen ? (
            <div className="admin-diagram-menu" role="menu">
              {(Object.keys(DIAGRAM_TEMPLATES) as DiagramTemplateKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  className="admin-diagram-menu-item"
                  onClick={() => insertDiagramTemplate(key)}
                >
                  {dict.admin.editor.diagramTemplates[key]}
                </button>
              ))}
              <p className="admin-diagram-menu-hint">{dict.admin.editor.diagramHelp}</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="admin-monaco-editor-host" ref={hostRef}>
        {gutterPlus ? (
          <button
            type="button"
            className="admin-monaco-gutter-plus"
            style={{ top: gutterPlus.top, left: gutterPlus.left }}
            aria-label="+"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              withEd((ed, m) => insertEmptyLineAfter(ed, m, gutterPlus.line));
              setGutterPlus(null);
            }}
          >
            +
          </button>
        ) : null}
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
              {linkModal.mode === "page" ? dict.admin.editor.pageLinkTitle : dict.admin.editor.urlTitle}
            </h3>
            {linkModal.mode === "page" ? (
              <AdminWikiLinkPicker
                lang={lang}
                labels={dict.admin.editor.pageLinkPicker}
                format={linkModal.format}
                onFormatChange={(format) => setLinkModal({ ...linkModal, format })}
                label={linkModal.label}
                onLabelChange={(label) => setLinkModal({ ...linkModal, label })}
                onSelect={(item) => insertPageLinkFromPicker(item, linkModal.format, linkModal.label)}
              />
            ) : (
              <>
                <input
                  style={inputStyle}
                  autoFocus
                  value={linkModal.url}
                  onChange={(e) => setLinkModal({ ...linkModal, url: e.target.value, error: "" })}
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
            {linkModal.mode === "url" && linkModal.error ? (
              <p style={{ margin: 0, color: "#ff5f7d", fontSize: 13 }}>{linkModal.error}</p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={tbBtn} onClick={() => setLinkModal(null)}>
                {dict.common.cancel}
              </button>
              {linkModal.mode === "url" ? (
                <button type="button" style={{ ...tbBtn, background: "var(--accent)", color: "#fff" }} onClick={submitLinkModal}>
                  {dict.common.save}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {mediaModal ? (
        <AdminMediaModal
          mode={mediaModal}
          dict={dict}
          onClose={() => setMediaModal(null)}
          onInsert={insertMediaSnippet}
        />
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
