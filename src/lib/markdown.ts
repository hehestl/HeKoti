import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { expandPostWikiLinks } from "@/lib/wiki-link-expand";
import { getWikiLinkPages } from "@/lib/wiki-link-index";
import {
  extractWikiHeadingsCached,
  injectHeadingIds,
  type WikiHeading,
} from "@/lib/wiki-headings";
import { clearSsrWindowPollution } from "@/lib/node-globals-guard";
import { renderMermaidFigure } from "@/lib/mermaid-render";
import { wrapPastedSvgFigure } from "@/lib/svg-sanitize";
import {
  extractDiagramBlocks,
  renderDiagramPlaceholders,
  wrapOrphanSvgs,
} from "@/lib/wiki-diagrams";
import { env } from "@/lib/env";

const EXTRA_TAGS = [
  "img",
  "video",
  "source",
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
  "span",
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "clipPath",
  "mask",
  "use",
  "marker",
  "title",
  "desc",
  "style",
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",
  "symbol",
] as const;

const MEDIA_SCHEMES = env.NODE_ENV === "development" ? ["http", "https"] : ["https"];

const SVG_ATTRS = [
  "viewBox",
  "xmlns",
  "fill",
  "stroke",
  "stroke-width",
  "transform",
  "d",
  "points",
  "cx",
  "cy",
  "r",
  "x",
  "y",
  "width",
  "height",
  "class",
  "id",
  "opacity",
  "text-anchor",
  "font-size",
  "font-family",
  "preserveAspectRatio",
  "href",
  "xlink:href",
];

function scrubMediaSrc(attribs: Record<string, string>): Record<string, string> {
  const src = attribs.src;
  if (!src) return attribs;
  const lower = src.trim().toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    const next = { ...attribs };
    delete next.src;
    return next;
  }
  return attribs;
}

export function renderMarkdown(markdown: string) {
  const dirty = marked.parse(markdown, { breaks: true }) as string;
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([...EXTRA_TAGS]),
    allowedSchemes: MEDIA_SCHEMES,
    allowedSchemesByTag: {
      img: MEDIA_SCHEMES,
      video: MEDIA_SCHEMES,
      source: MEDIA_SCHEMES,
    },
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
      video: ["src", "controls", "playsinline", "poster", "preload"],
      source: ["src", "type"],
      a: ["href", "name", "target", "rel"],
      span: ["data-hekoti-diagram"],
      svg: SVG_ATTRS,
      g: SVG_ATTRS,
      path: SVG_ATTRS,
      rect: SVG_ATTRS,
      circle: SVG_ATTRS,
      ellipse: SVG_ATTRS,
      line: SVG_ATTRS,
      polyline: SVG_ATTRS,
      polygon: SVG_ATTRS,
      text: SVG_ATTRS,
      tspan: SVG_ATTRS,
      use: SVG_ATTRS,
      marker: SVG_ATTRS,
      style: [],
    },
    transformTags: {
      img: (_tag, attribs) => ({ tagName: "img", attribs: scrubMediaSrc(attribs) }),
      video: (_tag, attribs) => ({ tagName: "video", attribs: scrubMediaSrc(attribs) }),
      source: (_tag, attribs) => ({ tagName: "source", attribs: scrubMediaSrc(attribs) }),
    },
  });
}

/** Renders wiki markdown: resolves `/post slug` to internal links, then HTML with heading ids. */
export async function renderWikiHtml(markdown: string, lang: string) {
  clearSsrWindowPollution();
  const headings = extractWikiHeadingsCached(markdown);
  const { markdown: mdWithPlaceholders, blocks } = extractDiagramBlocks(markdown);
  const pages = await getWikiLinkPages(lang);
  const expanded = expandPostWikiLinks(mdWithPlaceholders, lang, pages);
  let html = renderMarkdown(expanded);

  const rendered = await Promise.all(
    blocks.map((block) => {
      if (block.kind === "mermaid") {
        return renderMermaidFigure(block.source, { alt: block.alt });
      }
      return Promise.resolve(
        wrapPastedSvgFigure(block.source, { alt: block.alt, source: block.source, dualTheme: false }),
      );
    }),
  );

  html = renderDiagramPlaceholders(html, rendered);
  html = wrapOrphanSvgs(html);
  html = injectHeadingIds(html, headings);
  return html;
}

export function getWikiHeadings(markdown: string): WikiHeading[] {
  return extractWikiHeadingsCached(markdown);
}
