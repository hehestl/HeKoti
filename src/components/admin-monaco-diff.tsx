"use client";

import { useEffect, useRef } from "react";
import "@/lib/monaco-workers-env";
import * as monaco from "monaco-editor";

export function AdminMonacoDiff({
  original,
  modified,
  language = "markdown",
  theme = "vs",
  height = "min(50vh, 480px)",
}: {
  original: string;
  modified: string;
  language?: string;
  theme?: string;
  height?: string | number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const diffEditor = monaco.editor.createDiffEditor(node, {
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });

    const originalModel = monaco.editor.createModel(original, language);
    const modifiedModel = monaco.editor.createModel(modified, language);
    diffEditor.setModel({ original: originalModel, modified: modifiedModel });
    monaco.editor.setTheme(theme);

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
    };
  }, [language, modified, original, theme]);

  useEffect(() => {
    monaco.editor.setTheme(theme);
  }, [theme]);

  const h = typeof height === "number" ? `${height}px` : height;
  return <div ref={containerRef} style={{ width: "100%", height: h, border: "1px solid var(--line)", borderRadius: 8 }} />;
}
