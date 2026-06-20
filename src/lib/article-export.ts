import { apiFetch } from "@/lib/api-fetch";

export type ArticleExportRow = {
  title: string;
  lang: string;
  path: string;
  slug: string;
  isPublished: boolean;
  updatedAt?: string;
  contentMd: string;
};

function sanitizeFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base || "article";
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportArticleMarkdown(page: ArticleExportRow) {
  const body = `# ${page.title}\n\n${page.contentMd}`;
  downloadBlob(`${sanitizeFilename(page.title)}.md`, "text/markdown;charset=utf-8", body);
}

export function exportArticleCsv(page: ArticleExportRow) {
  const header = ["title", "lang", "path", "slug", "isPublished", "updatedAt", "contentMd"];
  const row = [
    page.title,
    page.lang,
    page.path,
    page.slug,
    String(page.isPublished),
    page.updatedAt ?? "",
    page.contentMd,
  ].map(csvEscape);
  const csv = `\uFEFF${header.join(",")}\n${row.join(",")}\n`;
  downloadBlob(`${sanitizeFilename(page.title)}.csv`, "text/csv;charset=utf-8", csv);
}

export async function exportArticlePdf(page: ArticleExportRow, lang: string) {
  const res = await apiFetch("/api/admin/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentMd: page.contentMd, lang }),
  });
  const data = (await res.json()) as { html?: string; message?: string };
  if (!res.ok || !data.html) {
    throw new Error(data.message ?? "Preview failed");
  }

  const printWin = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWin) {
    downloadBlob(`${sanitizeFilename(page.title)}.html`, "text/html;charset=utf-8", data.html);
    return;
  }

  printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${page.title}</title>
<style>
body{font-family:system-ui,sans-serif;line-height:1.6;padding:24px;color:#111}
h1,h2,h3,h4{margin:1.2em 0 .5em}
@media print{body{padding:0}}
</style></head><body><h1>${page.title}</h1>${data.html}</body></html>`);
  printWin.document.close();
  printWin.focus();
  printWin.print();
}
