"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { WikiDiagramEnhancer } from "@/components/wiki-diagram-enhancer";
import { apiFetch } from "@/lib/api-fetch";
import { wikiPublicHref } from "@/lib/wiki-path";

export function AdminEditorSplit({
  markdown,
  lang,
  pagePath,
  previewVisible,
  splitRatio,
  onSplitRatioChange,
  editor,
  dict,
}: {
  markdown: string;
  lang: string;
  pagePath: string;
  previewVisible: boolean;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  editor: React.ReactNode;
  dict: Record<string, string> & {
    diagramCopy?: string;
    diagramCopied?: string;
  };
}) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!previewVisible) return;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await apiFetch("/api/admin/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markdown, lang }),
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const body = (await res.json()) as { html?: string };
        setHtml(body.html ?? "");
        setLoading(false);
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [markdown, lang, previewVisible]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      onSplitRatioChange(ratio);
    },
    [onSplitRatioChange],
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove]);

  const startDrag = () => {
    dragging.current = true;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const publicHref = wikiPublicHref(lang, pagePath);

  return (
    <div ref={containerRef} className="admin-editor-split">
      <div className="admin-editor-split-editor" style={{ flex: previewVisible ? splitRatio : 1 }}>
        {editor}
      </div>
      {previewVisible ? (
        <>
          <div className="admin-editor-split-resizer" onMouseDown={startDrag} role="separator" aria-orientation="horizontal" />
          <div className="admin-editor-split-preview" style={{ flex: 1 - splitRatio }}>
            <div className="admin-editor-split-preview-toolbar">
              <span>{dict.previewTitle}</span>
              <a href={publicHref} target="_blank" rel="noopener noreferrer" className="admin-editor-split-preview-open">
                <ExternalLink size={14} aria-hidden />
                {dict.openInNewTab}
              </a>
            </div>
            <div className="admin-editor-split-preview-body">
              {loading ? <p className="admin-sidebar-hint">{dict.previewLoading}</p> : null}
              <WikiDiagramEnhancer
                copyLabel={dict.diagramCopy ?? "Copy diagram source"}
                copiedLabel={dict.diagramCopied ?? "Copied"}
              />
              <div className="wiki-article-body" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
