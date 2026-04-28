import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/db";
import { expandPostWikiLinks } from "@/lib/wiki-link-expand";

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
      "*": ["style"],
    },
  });
}

/** Renders wiki markdown: resolves `/post slug` to internal links, then HTML. */
export async function renderWikiHtml(markdown: string, lang: string) {
  const pages = await prisma.page.findMany({
    where: { lang, isPublished: true },
    select: { path: true, title: true },
  });
  const expanded = expandPostWikiLinks(markdown, lang, pages);
  return renderMarkdown(expanded);
}
