import type * as monaco from "monaco-editor";

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
  level: 2 | 3 | 4,
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
