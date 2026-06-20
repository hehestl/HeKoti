"use client";

import "@/lib/monaco-setup";
import Editor, { type EditorProps } from "@monaco-editor/react";

export type AdminMonacoEditorProps = EditorProps;

export default function AdminMonacoEditor(props: AdminMonacoEditorProps) {
  return <Editor {...props} />;
}
