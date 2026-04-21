import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { renderMarkdown } from "@/lib/markdown";
import { normalizePath } from "@/lib/slug";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}) {
  const { lang, slug } = await params;
  const user = await getSessionUser();
  if (!env.PUBLIC_READ_MODE && !user) return notFound();
  const cacheKey = `wiki:${lang}:${slug.join("/")}`;
  const cached = await getCached(cacheKey);

  let html: string;
  let title = "";
  if (cached) {
    const parsed = JSON.parse(cached) as { title: string; html: string };
    title = parsed.title;
    html = parsed.html;
  } else {
    const path = normalizePath(lang, slug);
    const page = await prisma.page.findUnique({ where: { path } });
    if (!page || !page.isPublished) return notFound();
    title = page.title;
    html = renderMarkdown(page.contentMd);
    await setCached(cacheKey, JSON.stringify({ title, html }));
  }

  return (
    <article
      style={{
        margin: "20px auto",
        maxWidth: 900,
        border: "1px solid var(--line)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: 20,
      }}
    >
      <h1>{title}</h1>
      <div style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
