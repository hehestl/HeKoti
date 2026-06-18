"use client";

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import Editor, { type EditorProps } from "@monaco-editor/react";

loader.config({ monaco });

export type AdminMonacoEditorProps = EditorProps;

export default function AdminMonacoEditor(props: AdminMonacoEditorProps) {
  return <Editor {...props} />;
}
