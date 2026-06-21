const CALLOUT_TYPES = ["NOTE", "INFO", "TIP", "WARNING", "SUCCESS"] as const;

const CALLOUT_BLOCK_RE = new RegExp(
  `^> \\[!(${CALLOUT_TYPES.join("|")})\\]\\s*\\n((?:> ?.*\\n?)*)`,
  "gim",
);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function calloutBodyToHtml(body: string): string {
  const lines = body
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trimEnd())
    .join("\n")
    .trim();
  if (!lines) return "";
  return lines
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function expandCalloutBlocks(markdown: string): string {
  return markdown.replace(CALLOUT_BLOCK_RE, (_match, rawType: string, body: string) => {
    const type = rawType.toLowerCase();
    const inner = calloutBodyToHtml(body);
    return `<aside class="wiki-callout wiki-callout--${type}"><span class="wiki-callout-label">${rawType}</span>${inner}</aside>\n\n`;
  });
}

export function insertCalloutSnippet(type: (typeof CALLOUT_TYPES)[number]): string {
  return `> [!${type}]\n> Content here.\n`;
}

export { CALLOUT_TYPES };
