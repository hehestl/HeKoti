"use client";

import { useEffect, useRef } from "react";
import "@/lib/monaco-workers-env";
import type * as Monaco from "monaco-editor";
import * as monaco from "monaco-editor";

export type AdminMonacoEditorProps = {
  value?: string;
  defaultValue?: string;
  language?: string;
  defaultLanguage?: string;
  theme?: string;
  height?: number | string;
  options?: Monaco.editor.IStandaloneEditorConstructionOptions;
  onChange?: (value: string) => void;
  onMount?: (editor: Monaco.editor.IStandaloneCodeEditor, monacoApi: typeof monaco) => void;
};

export default function AdminMonacoEditor({
  value,
  defaultValue,
  language,
  defaultLanguage,
  theme = "vs",
  height = "100%",
  options,
  onChange,
  onMount,
}: AdminMonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const onMountRef = useRef(onMount);
  const skipChangeRef = useRef(false);
  const lang = language ?? defaultLanguage ?? "markdown";
  const initialValue = value ?? defaultValue ?? "";

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onMountRef.current = onMount;
  }, [onMount]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const editor = monaco.editor.create(node, {
      value: initialValue,
      language: lang,
      theme,
      automaticLayout: true,
      ...options,
    });
    editorRef.current = editor;
    onMountRef.current?.(editor, monaco);

    const sub = editor.onDidChangeModelContent(() => {
      if (skipChangeRef.current) return;
      onChangeRef.current?.(editor.getValue());
    });

    return () => {
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === undefined) return;
    if (editor.getValue() === value) return;
    skipChangeRef.current = true;
    editor.setValue(value);
    skipChangeRef.current = false;
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && model.getLanguageId() !== lang) {
      monaco.editor.setModelLanguage(model, lang);
    }
  }, [lang]);

  useEffect(() => {
    monaco.editor.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!editorRef.current || !options) return;
    editorRef.current.updateOptions(options);
  }, [options]);

  const h = typeof height === "number" ? `${height}px` : height;

  return <div ref={containerRef} style={{ width: "100%", height: h }} />;
}
