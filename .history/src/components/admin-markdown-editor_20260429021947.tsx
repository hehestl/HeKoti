"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as monaco from "monaco-editor";
import {
  insertAtCursor,
  insertSnippetBlock,
  setHeadingLevel,
  toggleLinePrefix,
  wrapSelection,
} from "@/lib/monaco-md-helpers";
import { resolvePostWikiTarget } from "@/lib/wiki-link-expand";
import type { Dictionary } from "@/lib/i18n";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

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

export function AdminMarkdownEditor({ value, onChange, lang, wikiPages, dict, height = "60vh" }: Props) {
  const edRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monRef = useRef<typeof monaco | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ctx) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setCtx(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtx(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [ctx]);

  const withEd = useCallback((fn: (ed: monaco.editor.IStandaloneCodeEditor, m: typeof monaco) => void) => {
    const ed = edRef.current;
    const m = monRef.current;
    if (ed && m) fn(ed, m);
  }, []);

  const insertWikiPost = useCallback(() => {
    const raw = window.prompt(dict.admin.editor.postPrompt, "h2");
    if (raw == null || !raw.trim()) return;
    withEd((ed, m) => insertAtCursor(ed, m, `/post ${raw.trim().replace(/^\//, "")} `));
  }, [withEd, dict]);

  const insertWikiLink = useCallback(() => {
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      const label = model.getValueInRange(sel) || dict.admin.editor.linkPlaceholder;
      const slug = window.prompt(dict.admin.editor.linkPrompt, "h2");
      if (slug == null || !slug.trim()) return;
      const hit = resolvePostWikiTarget(slug.trim(), lang, wikiPages);
      if (!hit) {
        window.alert(dict.admin.editor.linkNotFound.replace("{slug}", slug.trim()));
        return;
      }
      ed.executeEdits("link", [{ range: sel, text: `[${label}](${hit.href})`, forceMoveMarkers: true }]);
      ed.focus();
    });
  }, [withEd, lang, wikiPages, dict]);

  const insertExternalLink = useCallback(() => {
    withEd((ed) => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel) return;
      const label = model.getValueInRange(sel) || dict.admin.editor.externalLinkPlaceholder;
      const url = window.prompt(dict.admin.editor.externalLinkPrompt, "https://");
      if (url == null || !url.trim()) return;
      ed.executeEdits("elink", [{ range: sel, text: `[${label}](${url.trim()})`, forceMoveMarkers: true }]);
      ed.focus();
    });
  }, [withEd, dict]);

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

  const toolbarGroups: { label: string; items: { key: string; t: string; title?: string }[] }[] = [
    {
      label: dict.admin.editor.text,
      items: [
        { key: "bold", t: dict.admin.editor.bold, title: dict.admin.editor.boldTitle },
        { key: "italic", t: dict.admin.editor.italic, title: dict.admin.editor.italicTitle },
        { key: "underline", t: dict.admin.editor.underline, title: dict.admin.editor.underlineTitle },
        { key: "strike", t: dict.admin.editor.strike, title: dict.admin.editor.strikeTitle },
      ],
    },
    {
      label: dict.admin.editor.headings,
      items: [
        { key: "h2", t: "H2", title: dict.admin.editor.h2Title },
        { key: "h3", t: "H3", title: dict.admin.editor.h3Title },
        { key: "h4", t: "H4", title: dict.admin.editor.h4Title },
      ],
    },
    {
      label: dict.admin.editor.structure,
      items: [
        { key: "bullet", t: dict.admin.editor.bullet, title: dict.admin.editor.bulletTitle },
        { key: "quote", t: dict.admin.editor.quote, title: dict.admin.editor.quoteTitle },
        { key: "hr", t: dict.admin.editor.hr, title: dict.admin.editor.hrTitle },
        { key: "table", t: dict.admin.editor.table, title: dict.admin.editor.tableTitle },
        { key: "details", t: dict.admin.editor.details, title: dict.admin.editor.detailsTitle },
        { key: "callout", t: dict.admin.editor.callout, title: dict.admin.editor.calloutTitle },
      ],
    },
    {
      label: dict.admin.editor.code,
      items: [
        { key: "code", t: dict.admin.editor.inlineCode, title: dict.admin.editor.inlineCodeTitle },
        { key: "codeBlock", t: dict.admin.editor.codeBlock, title: dict.admin.editor.codeBlockTitle },
        { key: "formula", t: dict.admin.editor.formula, title: dict.admin.editor.formulaTitle },
      ],
    },
  ];

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "flex-start",
          padding: "6px 8px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: "color-mix(in srgb, var(--fg) 4%, var(--panel))",
        }}
      >
        {toolbarGroups.map((g) => (
          <div key={g.label} style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--muted)", marginRight: 2 }}>{g.label}</span>
            {g.items.map((item) => (
              <button key={item.key} type="button" title={item.title} style={tbBtn} onClick={actions[item.key]}>
                {item.t}
              </button>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>Ссылки</span>
          <button type="button" style={tbBtn} title="/post slug — подставится при показе статьи" onClick={insertWikiPost}>
            /post
          </button>
          <button type="button" style={tbBtn} title="Внутренняя ссылка [текст](wiki)" onClick={insertWikiLink}>
            Вики
          </button>
          <button type="button" style={tbBtn} title="Внешняя URL" onClick={insertExternalLink}>
            URL
          </button>
          <button type="button" style={tbBtn} onClick={insertDateTime}>
            Дата
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
        <b>/post</b> в тексте (с пробелом или после новой строки): <code>/post h2</code> или <code>/post h1/h2</code> — при
        показе wiki заменяется на ссылку на опубликованную статью. ПКМ в поле — те же действия.
      </p>
      <div style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
        <MonacoEditor
          height={height}
          language="markdown"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={(editor, m) => {
            edRef.current = editor;
            monRef.current = m;
            editor.onContextMenu((e) => {
              e.event.preventDefault();
              e.event.stopPropagation();
              setCtx({ x: e.event.browserEvent.clientX, y: e.event.browserEvent.clientY });
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            contextmenu: false,
          }}
        />
        {ctx ? (
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: ctx.x,
              top: ctx.y,
              zIndex: 10000,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 6,
              boxShadow: "0 8px 24px color-mix(in srgb, black 35%, transparent)",
              display: "grid",
              gap: 4,
              maxWidth: 260,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
            role="menu"
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(
                [
                  ["bold", "Жирный"],
                  ["italic", "Курсив"],
                  ["underline", "Подчёрк"],
                  ["strike", "Зачёрк."],
                  ["h2", "H2"],
                  ["h3", "H3"],
                  ["code", "Код"],
                  ["bullet", "Список"],
                  ["quote", "Цитата"],
                  ["hr", "Линия"],
                  ["table", "Таблица"],
                  ["details", "Свёртка"],
                  ["callout", "Выноска"],
                  ["formula", "Формула"],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  role="menuitem"
                  style={{ ...tbBtn, fontSize: 11 }}
                  onClick={() => {
                    actions[k]();
                    setCtx(null);
                  }}
                >
                  {lab}
                </button>
              ))}
            </div>
            <button
              type="button"
              style={{ ...tbBtn, fontSize: 11, justifySelf: "stretch" }}
              onClick={() => {
                insertWikiLink();
                setCtx(null);
              }}
            >
              Ссылка вики…
            </button>
            <button
              type="button"
              style={{ ...tbBtn, fontSize: 11, justifySelf: "stretch" }}
              onClick={() => {
                insertExternalLink();
                setCtx(null);
              }}
            >
              Внешняя ссылка…
            </button>
            <button
              type="button"
              style={{ ...tbBtn, fontSize: 11, justifySelf: "stretch" }}
              onClick={() => {
                insertWikiPost();
                setCtx(null);
              }}
            >
              Вставить /post …
            </button>
            <button
              type="button"
              style={{ ...tbBtn, fontSize: 11, justifySelf: "stretch" }}
              onClick={() => {
                insertDateTime();
                setCtx(null);
              }}
            >
              Дата и время
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
