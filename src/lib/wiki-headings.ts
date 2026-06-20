export type WikiHeading = {
  level: 1 | 2 | 3 | 4;
  text: string;
  id: string;
};

const HEADING_RE = /^(#{1,4})\s+(.+)$/;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function slugifyHeadingId(text: string, usedIds: Set<string>): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const seed = base || "section";
  let id = seed;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${seed}-${n}`;
    n += 1;
  }
  usedIds.add(id);
  return id;
}

export function extractWikiHeadings(markdown: string): WikiHeading[] {
  const usedIds = new Set<string>();
  const headings: WikiHeading[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = HEADING_RE.exec(line);
    if (!match) continue;
    const level = match[1].length as 1 | 2 | 3 | 4;
    const text = stripInlineMarkdown(match[2]);
    if (!text) continue;
    const id = slugifyHeadingId(text, usedIds);
    headings.push({ level, text, id });
  }

  return headings;
}

const headingCache = new Map<string, WikiHeading[]>();
const CACHE_MAX = 64;

export function extractWikiHeadingsCached(markdown: string): WikiHeading[] {
  if (markdown.length < 4000) {
    return extractWikiHeadings(markdown);
  }
  const key = `${markdown.length}:${markdown.slice(0, 120)}:${markdown.slice(-120)}`;
  const hit = headingCache.get(key);
  if (hit) return hit;
  const result = extractWikiHeadings(markdown);
  if (headingCache.size >= CACHE_MAX) {
    const first = headingCache.keys().next().value;
    if (first) headingCache.delete(first);
  }
  headingCache.set(key, result);
  return result;
}

export function injectHeadingIds(html: string, headings: WikiHeading[]): string {
  if (headings.length === 0) return html;

  let index = 0;
  return html.replace(/<h([1-4])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (full, level: string, attrs = "", inner: string) => {
    if (index >= headings.length) return full;
    const heading = headings[index];
    index += 1;
    if (attrs.includes("id=")) return full;
    const safeId = heading.id.replace(/"/g, "");
    return `<h${level} id="${safeId}"${attrs}>${inner}</h${level}>`;
  });
}

export function shouldShowWikiToc(showToc: boolean, headings: WikiHeading[]): boolean {
  return showToc && headings.length > 0;
}
