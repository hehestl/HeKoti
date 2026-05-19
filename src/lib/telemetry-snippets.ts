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

// Patterns that indicate potentially dangerous content
const DANGEROUS_PATTERNS = [
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /on\w+\s*=/i, // event handlers like onclick=, onload=, etc.
  /expression\s*\(/i, // CSS expression()
  /import\s+/i, // CSS @import
  /behavior\s*:/i, // CSS behavior
];

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
    
    // Block dangerous protocols
    if (["javascript:", "data:", "vbscript:"].includes(u.protocol.toLowerCase())) {
      return false;
    }
    
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    // If URL parsing fails, check if it's a relative path (allowed)
    if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
      return true;
    }
    return false;
  }
}

/**
 * Check for dangerous patterns in content
 */
function hasDangerousContent(content: string): string[] {
  const violations: string[] = [];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Potentially dangerous pattern detected: ${pattern.source}`);
      break; // One violation is enough to flag
    }
  }
  
  return violations;
}

function sanitizeAttrs(kind: SnippetNode["kind"], attrsRaw: Record<string, string | boolean>, violations: string[]) {
  const attrs: Record<string, string | boolean> = {};
  const allowByKind: Record<string, Set<string>> = {
    script: new Set(["src", "async", "defer", "type", "crossorigin", "referrerpolicy", "nonce", "integrity"]),
    meta: new Set(["name", "content", "property", "charset", "http-equiv"]),
    link: new Set(["rel", "href", "as", "type", "crossorigin", "referrerpolicy", "media", "integrity", "sizes"]),
    noscript: new Set(["id"]),
  };
  const allowed = allowByKind[kind];

  for (const [key, value] of Object.entries(attrsRaw)) {
    const low = key.toLowerCase();
    
    // Block all event handlers (on* attributes)
    if (low.startsWith("on")) {
      violations.push(`Event attribute "${key}" is not allowed.`);
      continue;
    }
    
    // Block style attribute (can contain dangerous CSS)
    if (low === "style") {
      violations.push(`Style attribute is not allowed.`);
      continue;
    }
    
    if (low.startsWith("data-")) {
      // Validate data-* attribute values for dangerous content
      if (typeof value === "string" && hasDangerousContent(value).length > 0) {
        violations.push(`data-${key} contains potentially dangerous content.`);
        continue;
      }
      attrs[low] = value;
      continue;
    }
    
    if (!allowed.has(low)) {
      violations.push(`Attribute "${key}" is not allowed on <${kind}>.`);
      continue;
    }
    
    // Validate URL attributes for dangerous patterns
    if (typeof value === "string" && (low === "src" || low === "href" || low === "content")) {
      const dangerousPatterns = hasDangerousContent(value);
      if (dangerousPatterns.length > 0) {
        violations.push(`Attribute "${key}" contains potentially dangerous content.`);
        continue;
      }
    }
    
    attrs[low] = value;
  }

  if (kind === "script" && typeof attrs.src === "string") {
    if (!isAllowedExternalUrl(attrs.src)) {
      violations.push(`Script src host is not allowlisted: ${attrs.src}`);
      delete attrs.src;
    }
    // Recommend SRI (Subresource Integrity) for external scripts
    if (attrs.src && !attrs.integrity) {
      // Warning only, not a violation
    }
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

  // Check for dangerous patterns in the entire HTML before parsing
  const dangerousPatterns = hasDangerousContent(src);
  if (dangerousPatterns.length > 0) {
    violations.push("Potentially dangerous content detected in the HTML.");
  }

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
    // Check script content for dangerous patterns
    const content = m[2] ?? "";
    const contentViolations = hasDangerousContent(content);
    if (contentViolations.length > 0) {
      violations.push("Script content contains potentially dangerous patterns.");
    }
    out.push({ kind: "script", attrs, content });
  }
  for (const m of src.matchAll(/<meta\b([^>]*)\/?>/gi)) {
    const attrsRaw = parseAttrs(m[1] ?? "");
    const httpEquiv = String(attrsRaw["http-equiv"] ?? "").toLowerCase();
    if (httpEquiv === "content-security-policy") {
      violations.push("Meta Content-Security-Policy is not allowed; CSP is set via HTTP headers.");
      continue;
    }
    const attrs = sanitizeAttrs("meta", attrsRaw, violations);
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
