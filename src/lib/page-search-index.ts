import { extractWikiHeadings } from "@/lib/wiki-headings";
import type { PageScope } from "@prisma/client";

export type SearchTextLineKind = "title" | "heading" | "sentence";

export type SearchTextLine = {
  kind: SearchTextLineKind;
  text: string;
};

export type SearchLineMatch = {
  kind: SearchTextLineKind;
  text: string;
  display: string;
};

const HEADING_PREFIX = "H: ";
const SENTENCE_PREFIX = "S: ";
const MAX_SENTENCES = 60;
const MAX_BYTES = 24 * 1024;
const MIN_SENTENCE_LEN = 12;

const FENCED_CODE_RE = /```[\s\S]*?```/g;
const HEADING_LINE_RE = /^#{1,6}\s+/;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripMarkdownToPlain(contentMd: string): string {
  let md = contentMd.replace(FENCED_CODE_RE, "\n");
  const lines: string[] = [];

  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (HEADING_LINE_RE.test(line)) continue;
    if (/^```/.test(line)) continue;

    const listMatch = /^[-*+]\s+(.+)$/.exec(line);
    const numberedMatch = /^\d+\.\s+(.+)$/.exec(line);
    const plain = stripInlineMarkdown(listMatch?.[1] ?? numberedMatch?.[1] ?? line);
    if (plain) lines.push(plain);
  }

  return lines.join("\n");
}

export function extractPlainSentences(plain: string): string[] {
  const chunks = plain
    .split(/(?:[.!?]+|\n\n+)/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= MIN_SENTENCE_LEN);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of chunks) {
    const key = chunk.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunk);
    if (out.length >= MAX_SENTENCES) break;
  }
  return out;
}

export function buildPageSearchText(title: string, contentMd: string): string {
  const lines: string[] = [];
  const titleLine = title.trim();
  if (titleLine) lines.push(titleLine);

  for (const h of extractWikiHeadings(contentMd)) {
    if (h.text.trim()) lines.push(`${HEADING_PREFIX}${h.text.trim()}`);
  }

  for (const sentence of extractPlainSentences(stripMarkdownToPlain(contentMd))) {
    lines.push(`${SENTENCE_PREFIX}${sentence}`);
  }

  let result = lines.join("\n");
  while (result.length > MAX_BYTES) {
    const cut = result.lastIndexOf("\n");
    if (cut <= 0) break;
    result = result.slice(0, cut);
  }
  return result;
}

export function parseSearchTextLines(searchText: string): SearchTextLine[] {
  if (!searchText.trim()) return [];

  const lines: SearchTextLine[] = [];
  for (const raw of searchText.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(HEADING_PREFIX)) {
      lines.push({ kind: "heading", text: line.slice(HEADING_PREFIX.length).trim() });
      continue;
    }
    if (line.startsWith(SENTENCE_PREFIX)) {
      lines.push({ kind: "sentence", text: line.slice(SENTENCE_PREFIX.length).trim() });
      continue;
    }
    lines.push({ kind: "title", text: line });
  }
  return lines;
}

function lineContainsAllTerms(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.every((t) => lower.includes(t));
}

function scoreLine(kind: SearchTextLineKind, text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  if (lineContainsAllTerms(text, terms)) {
    if (kind === "heading") score += 8;
    else if (kind === "sentence") score += 5;
    else score += 10;
  }
  for (const t of terms) {
    if (!lower.includes(t)) continue;
    if (kind === "heading") score += 3;
    else if (kind === "sentence") score += 1;
    else score += 3;
  }
  return score;
}

export function pickBestSearchLine(searchText: string, terms: string[]): SearchLineMatch | null {
  if (!searchText.trim() || terms.length === 0) return null;

  let best: { line: SearchTextLine; score: number } | null = null;
  for (const line of parseSearchTextLines(searchText)) {
    if (!line.text) continue;
    const score = scoreLine(line.kind, line.text, terms);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { line, score };
  }

  if (!best) return null;
  return {
    kind: best.line.kind,
    text: best.line.text,
    display: best.line.text,
  };
}

export function formatSearchSnippet(
  match: SearchLineMatch | null,
  labels: { snippetHeadingPrefix: string },
  terms: string[],
  maxLen = 120,
): string {
  if (!match) return "";
  if (match.kind === "heading") {
    return labels.snippetHeadingPrefix.replace("{heading}", match.text);
  }
  const text = match.text;
  const lower = text.toLowerCase();
  let hitIndex = -1;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx >= 0 && (hitIndex < 0 || idx < hitIndex)) hitIndex = idx;
  }
  if (hitIndex < 0) {
    return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
  }
  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, hitIndex - half);
  const end = Math.min(text.length, start + maxLen);
  const slice = text.slice(start, end).trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${slice}${suffix}`;
}

export function applyPageSearchText(
  data: { title: string; contentMd: string; scope?: PageScope },
): { searchText: string } {
  if (data.scope === "NOTES") return { searchText: "" };
  return { searchText: buildPageSearchText(data.title, data.contentMd) };
}

export function scoreSearchTextLines(searchText: string, terms: string[], excerpt: string | null | undefined): number {
  let score = 0;
  for (const line of parseSearchTextLines(searchText)) {
    score += scoreLine(line.kind, line.text, terms);
  }
  if (excerpt) {
    const excerptLower = excerpt.toLowerCase();
    for (const t of terms) {
      if (excerptLower.includes(t)) score += 2;
    }
  }
  return score;
}
