import type * as monaco from "monaco-editor";

export type BlockLineType = "text" | "h1" | "h2" | "h3" | "h4" | "bullet" | "numbered" | "todo";

function stripBlockPrefix(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+\[[ xX]\]\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trimStart();
}

function prefixForType(type: BlockLineType): string {
  switch (type) {
    case "h1":
      return "# ";
    case "h2":
      return "## ";
    case "h3":
      return "### ";
    case "h4":
      return "#### ";
    case "bullet":
      return "- ";
    case "numbered":
      return "1. ";
    case "todo":
      return "- [ ] ";
    default:
      return "";
  }
}

export function setBlockTypeAtLine(
  editor: monaco.editor.IStandaloneCodeEditor,
  Mon: typeof monaco,
  lineNumber: number,
  type: BlockLineType,
) {
  const model = editor.getModel();
  if (!model) return;

  const line = model.getLineContent(lineNumber);
  const stripped = stripBlockPrefix(line);
  const next = type === "text" ? stripped : `${prefixForType(type)}${stripped}`;
  const range = new Mon.Range(lineNumber, 1, lineNumber, line.length + 1);
  editor.executeEdits("md-block-type", [{ range, text: next, forceMoveMarkers: true }]);
  editor.setPosition({ lineNumber, column: next.length + 1 });
  editor.focus();
}

export function wrapSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  Mon: typeof monaco,
  before: string,
  after: string,
) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) {
    return;
  }
  const text = model.getValueInRange(sel);
  if (text.length > 0) {
    editor.executeEdits("md-wrap", [{ range: sel, text: `${before}${text}${after}`, forceMoveMarkers: true }]);
  } else {
    const pos = sel.getStartPosition();
    const insert = `${before}${after}`;
    editor.executeEdits("md-wrap", [
      {
        range: new Mon.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: insert,
        forceMoveMarkers: true,
      },
    ]);
    editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + before.length });
  }
  editor.focus();
}

export function toggleLinePrefix(
  editor: monaco.editor.IStandaloneCodeEditor,
  Mon: typeof monaco,
  prefix: string,
) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) {
    return;
  }
  const start = sel.startLineNumber;
  const end = sel.endLineNumber;
  for (let ln = start; ln <= end; ln++) {
    const line = model.getLineContent(ln);
    const range = new Mon.Range(ln, 1, ln, line.length + 1);
    const next = line.startsWith(prefix) ? line.slice(prefix.length) : `${prefix}${line}`;
    editor.executeEdits("md-prefix", [{ range, text: next, forceMoveMarkers: true }]);
  }
  editor.focus();
}

export function setHeadingLevel(
  editor: monaco.editor.IStandaloneCodeEditor,
  Mon: typeof monaco,
  level: 1 | 2 | 3 | 4,
) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) {
    return;
  }
  const hashes = `${"#".repeat(level)} `;
  const start = sel.startLineNumber;
  const end = sel.endLineNumber;
  for (let ln = start; ln <= end; ln++) {
    const line = model.getLineContent(ln);
    const stripped = line.replace(/^#{1,6}\s+/, "");
    const range = new Mon.Range(ln, 1, ln, line.length + 1);
    editor.executeEdits("md-h", [{ range, text: `${hashes}${stripped}`, forceMoveMarkers: true }]);
  }
  editor.focus();
}

export function insertEmptyLineAfter(
  editor: monaco.editor.IStandaloneCodeEditor,
  Mon: typeof monaco,
  lineNumber: number,
) {
  const model = editor.getModel();
  if (!model) return;
  const eol = model.getEOL();
  const insertAt = lineNumber + 1;
  editor.executeEdits("md-line-insert", [
    {
      range: new Mon.Range(insertAt, 1, insertAt, 1),
      text: eol,
      forceMoveMarkers: true,
    },
  ]);
  editor.setPosition({ lineNumber: insertAt, column: 1 });
  editor.focus();
}

export function insertAtCursor(editor: monaco.editor.IStandaloneCodeEditor, Mon: typeof monaco, text: string) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) {
    return;
  }
  editor.executeEdits("md-ins", [{ range: sel, text, forceMoveMarkers: true }]);
  editor.focus();
}

export function insertSnippetBlock(editor: monaco.editor.IStandaloneCodeEditor, Mon: typeof monaco, block: string) {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel) {
    return;
  }
  const pos = sel.getStartPosition();
  const pad =
    pos.column > 1 || model.getLineContent(pos.lineNumber).length > 0 ? (model.getEOL() === "\r\n" ? "\r\n\r\n" : "\n\n") : "";
  const insert = `${pad}${block}${pad}`;
  editor.executeEdits("md-block", [
    {
      range: new Mon.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
      text: insert,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}
