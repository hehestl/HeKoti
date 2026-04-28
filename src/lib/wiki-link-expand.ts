import { pathSegmentsAfterLang } from "@/lib/wiki-path";

export type WikiLinkPage = { path: string; title: string };

/** Public wiki URL from stored path `/en/a/b` → `/en/wiki/a/b`. */
export function wikiHrefFromStoredPath(pagePath: string, lang: string): string {
  const segs = pathSegmentsAfterLang(pagePath, lang);
  if (segs.length === 0) {
    return `/${lang}/wiki`;
  }
  return `/${lang}/wiki/${segs.join("/")}`;
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Resolves `/post slug` or `/post parent/child` against published pages (exact path, else shortest suffix match).
 */
export function resolvePostWikiTarget(
  tokenRaw: string,
  lang: string,
  pages: WikiLinkPage[],
): { href: string; title: string } | null {
  const parts = tokenRaw
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => decodeURIComponent(p).toLowerCase());
  if (parts.length === 0) {
    return null;
  }

  let exact: WikiLinkPage | undefined;
  const suffix: (WikiLinkPage & { depth: number })[] = [];

  for (const p of pages) {
    const segs = pathSegmentsAfterLang(p.path, lang);
    if (segs.length === 0) {
      continue;
    }
    const segsLower = segs.map((s) => s.toLowerCase());
    if (arraysEqual(segsLower, parts)) {
      exact = p;
      break;
    }
    if (segsLower.length >= parts.length) {
      const tail = segsLower.slice(-parts.length);
      if (tail.every((s, i) => s === parts[i])) {
        suffix.push({ ...p, depth: segsLower.length });
      }
    }
  }

  const pick = exact ?? suffix.sort((a, b) => a.depth - b.depth)[0];
  if (!pick) {
    return null;
  }
  return { href: wikiHrefFromStoredPath(pick.path, lang), title: pick.title };
}

const POST_CMD_RE = /(^|[\s>])\/post\s+(\S+)/gim;

/**
 * Turns `/post h2` into `[Title](/lang/wiki/h2)` using the page list (typically published only for public wiki).
 */
export function expandPostWikiLinks(markdown: string, lang: string, pages: WikiLinkPage[]): string {
  return markdown.replace(POST_CMD_RE, (full, prefix: string, token: string) => {
    const resolved = resolvePostWikiTarget(String(token), lang, pages);
    if (!resolved) {
      return full;
    }
    const safeTitle = resolved.title.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
    const before = prefix === ">" ? "> " : prefix;
    return `${before}[${safeTitle}](${resolved.href})`;
  });
}
