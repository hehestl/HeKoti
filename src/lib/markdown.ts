import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { expandPostWikiLinks } from "@/lib/wiki-link-expand";
import { getWikiLinkPages } from "@/lib/wiki-link-index";
import {
  extractWikiHeadingsCached,
  injectHeadingIds,
  type WikiHeading,
} from "@/lib/wiki-headings";

const EXTRA_TAGS = [
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "u",
  "del",
  "details",
  "summary",
  "aside",
  "kbd",
  "mark",
] as const;

export function renderMarkdown(markdown: string) {
  const dirty = marked.parse(markdown, { breaks: true }) as string;
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([...EXTRA_TAGS]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
      a: ["href", "name", "target", "rel"],
    },
  });
}

/** Renders wiki markdown: resolves `/post slug` to internal links, then HTML with heading ids. */
export async function renderWikiHtml(markdown: string, lang: string) {
  const headings = extractWikiHeadingsCached(markdown);
  const pages = await getWikiLinkPages(lang);
  const expanded = expandPostWikiLinks(markdown, lang, pages);
  const html = injectHeadingIds(renderMarkdown(expanded), headings);
  return html;
}

export function getWikiHeadings(markdown: string): WikiHeading[] {
  return extractWikiHeadingsCached(markdown);
}
