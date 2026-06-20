import { createHash } from "node:crypto";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const SVG_ALLOWED_TAGS = [
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
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feFuncR",
  "feFuncG",
  "feFuncB",
  "feFuncA",
  "feMerge",
  "feMergeNode",
  "feFlood",
] as const;

const FORBIDDEN_TAGS = new Set(["script", "iframe", "object", "embed", "foreignObject"]);

const SVG_ALLOWED_ATTR = [
  "viewBox",
  "xmlns",
  "xmlns:xlink",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-opacity",
  "fill-opacity",
  "opacity",
  "transform",
  "d",
  "points",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "width",
  "height",
  "class",
  "id",
  "aria-hidden",
  "aria-label",
  "role",
  "preserveAspectRatio",
  "text-anchor",
  "dominant-baseline",
  "font-family",
  "font-size",
  "font-weight",
  "alignment-baseline",
  "marker-start",
  "marker-end",
  "marker-mid",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "patternTransform",
  "clip-path",
  "mask",
  "filter",
  "href",
  "xlink:href",
  "xlink:title",
  "style",
];

const UNSAFE_URI = /^\s*(javascript:|data:)/i;

let purify: ReturnType<typeof DOMPurify> | null = null;

function getPurify() {
  if (!purify) {
    const window = new JSDOM("").window;
    purify = DOMPurify(window);
    purify.addHook("uponSanitizeAttribute", (_node, data) => {
      if (typeof data.attrValue !== "string") return;
      const name = data.attrName.toLowerCase();
      if (name.startsWith("on")) {
        data.keepAttr = false;
        return;
      }
      if ((name === "href" || name === "xlink:href" || name === "src") && UNSAFE_URI.test(data.attrValue)) {
        data.keepAttr = false;
        return;
      }
      if (name === "xlink:href" || name === "href") {
        const v = data.attrValue.trim();
        if (v && !v.startsWith("#") && !v.startsWith("url(#")) {
          data.keepAttr = false;
        }
      }
    });
  }
  return purify;
}

export function sanitizeDiagramSvg(svg: string): string {
  const trimmed = svg.trim();
  if (!trimmed) return "";

  const cleaned = getPurify().sanitize(trimmed, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: SVG_ALLOWED_TAGS.filter((t) => !FORBIDDEN_TAGS.has(t)),
    ALLOWED_ATTR: SVG_ALLOWED_ATTR,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "foreignObject"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });

  return cleaned.replace(/\sstyle="[^"]*url\s*\(\s*javascript:/gi, "");
}

function diagramId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 10);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function encodeDiagramSource(source: string): string {
  return Buffer.from(source, "utf8").toString("base64url");
}

export function decodeDiagramSource(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

export type DiagramFigureMeta = {
  alt?: string;
  source?: string;
  dualTheme?: boolean;
};

export function wrapDiagramFigure(
  lightSvg: string,
  darkSvg: string,
  meta?: DiagramFigureMeta,
): string {
  const id = diagramId(`${lightSvg}:${darkSvg}:${meta?.source ?? ""}`);
  const alt = meta?.alt?.trim();
  const caption = alt
    ? `<figcaption id="diagram-${id}-title" class="wiki-diagram-sr-only">${escapeHtml(alt)}</figcaption>`
    : "";
  const labelledBy = alt ? ` aria-labelledby="diagram-${id}-title"` : "";
  const sourceAttr = meta?.source
    ? ` data-diagram-source="${encodeDiagramSource(meta.source)}"`
    : "";
  const dual = meta?.dualTheme !== false && lightSvg !== darkSvg;

  const darkLayer = dual
    ? `<div class="wiki-diagram-svg wiki-diagram-svg--dark">${darkSvg}</div>`
    : "";

  return `<figure class="wiki-diagram" role="img"${labelledBy}${sourceAttr}>${caption}<div class="wiki-diagram-toolbar"><button type="button" class="wiki-diagram-copy-btn" data-diagram-copy hidden></button></div><div class="wiki-diagram-svg wiki-diagram-svg--light">${lightSvg}</div>${darkLayer}</figure>`;
}

export function wrapDiagramError(source: string): string {
  return `<pre class="wiki-diagram-error"><code>${escapeHtml(source)}</code></pre>`;
}

export function wrapPastedSvgFigure(svg: string, meta?: DiagramFigureMeta): string {
  const safe = sanitizeDiagramSvg(svg);
  if (!safe.includes("<svg")) return "";
  return wrapDiagramFigure(safe, safe, { ...meta, dualTheme: false });
}
