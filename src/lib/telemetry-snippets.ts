type SnippetNode =
  | { kind: "script"; attrs: Record<string, string | boolean>; content: string }
  | { kind: "meta"; attrs: Record<string, string | boolean> }
  | { kind: "link"; attrs: Record<string, string | boolean> }
  | { kind: "noscript"; attrs: Record<string, string | boolean>; content: string };

const ALLOWED_HOSTS = new Set([
  "mc.yandex.ru",
  "yastatic.net",
  "www.googletagmanager.com",
  "www.google-analytics.com",
  "google-analytics.com",
]);

function parseAttrs(raw: string) {
  const attrs: Record<string, string | boolean> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const m of raw.matchAll(re)) {
    const key = m[1]!;
    const val = m[2] ?? m[3] ?? m[4];
    attrs[key.toLowerCase()] = val === undefined ? true : val;
  }
  return attrs;
}

function isAllowedExternalUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function sanitizeAttrs(kind: SnippetNode["kind"], attrsRaw: Record<string, string | boolean>, violations: string[]) {
  const attrs: Record<string, string | boolean> = {};
  const allowByKind: Record<string, Set<string>> = {
    script: new Set(["src", "async", "defer", "type", "crossorigin", "referrerpolicy"]),
    meta: new Set(["name", "content", "property", "charset", "http-equiv"]),
    link: new Set(["rel", "href", "as", "type", "crossorigin", "referrerpolicy", "media"]),
    noscript: new Set(["id"]),
  };
  const allowed = allowByKind[kind];

  for (const [key, value] of Object.entries(attrsRaw)) {
    const low = key.toLowerCase();
    if (low.startsWith("on")) {
      violations.push(`Event attribute "${key}" is not allowed.`);
      continue;
    }
    if (low.startsWith("data-")) {
      attrs[low] = value;
      continue;
    }
    if (!allowed.has(low)) {
      violations.push(`Attribute "${key}" is not allowed on <${kind}>.`);
      continue;
    }
    attrs[low] = value;
  }

  if (kind === "script" && typeof attrs.src === "string" && !isAllowedExternalUrl(attrs.src)) {
    violations.push(`Script src host is not allowlisted: ${attrs.src}`);
    delete attrs.src;
  }
  if (kind === "link" && typeof attrs.href === "string" && !isAllowedExternalUrl(attrs.href)) {
    violations.push(`Link href host is not allowlisted: ${attrs.href}`);
    delete attrs.href;
  }
  return attrs;
}

export function parseTelemetrySnippet(html: string): { nodes: SnippetNode[]; violations: string[] } {
  const out: SnippetNode[] = [];
  const src = html || "";
  const violations: string[] = [];

  const remaining = src
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, "")
    .replace(/<link\b[^>]*\/?>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .trim();
  if (remaining.length > 0) {
    violations.push("Only <script>, <meta>, <link>, and <noscript> tags are allowed.");
  }

  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = sanitizeAttrs("script", parseAttrs(m[1] ?? ""), violations);
    out.push({ kind: "script", attrs, content: m[2] ?? "" });
  }
  for (const m of src.matchAll(/<meta\b([^>]*)\/?>/gi)) {
    const attrs = sanitizeAttrs("meta", parseAttrs(m[1] ?? ""), violations);
    out.push({ kind: "meta", attrs });
  }
  for (const m of src.matchAll(/<link\b([^>]*)\/?>/gi)) {
    const attrs = sanitizeAttrs("link", parseAttrs(m[1] ?? ""), violations);
    out.push({ kind: "link", attrs });
  }
  for (const m of src.matchAll(/<noscript\b([^>]*)>([\s\S]*?)<\/noscript>/gi)) {
    const attrs = sanitizeAttrs("noscript", parseAttrs(m[1] ?? ""), violations);
    out.push({ kind: "noscript", attrs, content: m[2] ?? "" });
  }
  return { nodes: out, violations };
}

export function lintTelemetrySnippet(html: string) {
  const { violations } = parseTelemetrySnippet(html);
  return violations;
}
