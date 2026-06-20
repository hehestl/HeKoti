import { wrapPastedSvgFigure } from "@/lib/svg-sanitize";

export type MermaidDiagramBlock = {
  kind: "mermaid";
  source: string;
  alt?: string;
};

export type SvgDiagramBlock = {
  kind: "svg";
  source: string;
  alt?: string;
};

export type DiagramBlock = MermaidDiagramBlock | SvgDiagramBlock;

const MERMAID_FENCE =
  / {0,3}```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n {0,3}```[ \t]*(?:\r?\n|$)/;
const SVG_FENCE = / {0,3}```svg[ \t]*\r?\n([\s\S]*?)\r?\n {0,3}```[ \t]*(?:\r?\n|$)/;

function parseAltAfterFence(rest: string): { alt?: string; consumed: number } {
  const trimmed = rest.replace(/^\r?\n/, "");
  const match = /^alt:\s*(.+?)(?:\r?\n|$)/.exec(trimmed);
  if (!match) return { consumed: 0 };
  const consumed = rest.length - trimmed.length + match[0].length;
  return { alt: match[1].trim(), consumed };
}

function extractNextFence(
  markdown: string,
): { block: DiagramBlock; start: number; end: number } | null {
  const mermaidMatch = MERMAID_FENCE.exec(markdown);
  const svgMatch = SVG_FENCE.exec(markdown);

  if (!mermaidMatch && !svgMatch) return null;

  const pickMermaid =
    mermaidMatch &&
    (!svgMatch || (mermaidMatch.index ?? 0) <= (svgMatch.index ?? 0));

  const match = pickMermaid ? mermaidMatch! : svgMatch!;
  const start = match.index ?? 0;
  const fenceEnd = start + match[0].length;
  const rest = markdown.slice(fenceEnd);
  const { alt, consumed } = parseAltAfterFence(rest);
  const end = fenceEnd + consumed;
  const source = match[1] ?? "";

  if (pickMermaid) {
    return { block: { kind: "mermaid", source, alt }, start, end };
  }
  return { block: { kind: "svg", source, alt }, start, end };
}

export function extractDiagramBlocks(markdown: string): {
  markdown: string;
  blocks: DiagramBlock[];
} {
  const blocks: DiagramBlock[] = [];
  let result = "";
  let cursor = 0;

  while (cursor < markdown.length) {
    const slice = markdown.slice(cursor);
    const next = extractNextFence(slice);
    if (!next) {
      result += markdown.slice(cursor);
      break;
    }
    const absStart = cursor + next.start;
    const absEnd = cursor + next.end;
    result += markdown.slice(cursor, absStart);
    const idx = blocks.length;
    blocks.push(next.block);
    result += `<span data-hekoti-diagram="${idx}"></span>`;
    cursor = absEnd;
  }

  return { markdown: result, blocks };
}

export function renderDiagramPlaceholders(html: string, rendered: string[]): string {
  let out = html;
  for (let i = 0; i < rendered.length; i++) {
    const span = `<span data-hekoti-diagram="${i}"></span>`;
    out = out.split(span).join(rendered[i] ?? "");
    const encoded = span.replace(/"/g, "&quot;");
    out = out.split(encoded).join(rendered[i] ?? "");
  }
  return out;
}

const ORPHAN_SVG_RE = /<svg[\s\S]*?<\/svg>/gi;

export function wrapOrphanSvgs(html: string): string {
  return html.replace(ORPHAN_SVG_RE, (match, offset) => {
    const before = html.slice(Math.max(0, offset - 200), offset);
    if (before.includes("wiki-diagram-svg") || before.includes('class="wiki-diagram"')) {
      return match;
    }
    const wrapped = wrapPastedSvgFigure(match);
    return wrapped || match;
  });
}
