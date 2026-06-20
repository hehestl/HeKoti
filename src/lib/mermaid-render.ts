import "./mermaid-polyfill";
import { createHash } from "node:crypto";
import mermaid from "isomorphic-mermaid";
import { getCached, setCached } from "@/lib/cache";
import {
  sanitizeDiagramSvg,
  wrapDiagramError,
  wrapDiagramFigure,
  type DiagramFigureMeta,
} from "@/lib/svg-sanitize";

const CACHE_VERSION = "v1";

function cacheKey(source: string, alt?: string): string {
  const normalized = source.trim();
  const hash = createHash("sha256").update(`${normalized}\0${alt ?? ""}`).digest("hex");
  return `hekoti:diagram:mermaid:${CACHE_VERSION}:${hash}`;
}

async function renderWithTheme(source: string, theme: "default" | "dark"): Promise<string> {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    htmlLabels: false,
    logLevel: "error",
    theme,
  });
  const id = `hekoti-${createHash("sha256").update(`${source}:${theme}`).digest("hex").slice(0, 16)}`;
  const { svg } = await mermaid.render(id, source);
  return sanitizeDiagramSvg(svg);
}

export async function renderMermaidFigure(
  source: string,
  meta?: DiagramFigureMeta,
): Promise<string> {
  const normalized = source.trim();
  if (!normalized) return wrapDiagramError(source);

  const key = cacheKey(normalized, meta?.alt);
  const cached = await getCached(key);
  if (cached) return cached;

  try {
    const [lightSvg, darkSvg] = await Promise.all([
      renderWithTheme(normalized, "default"),
      renderWithTheme(normalized, "dark"),
    ]);
    const html = wrapDiagramFigure(lightSvg, darkSvg, { ...meta, source: normalized, dualTheme: true });
    await setCached(key, html);
    return html;
  } catch {
    return wrapDiagramError(source);
  }
}
