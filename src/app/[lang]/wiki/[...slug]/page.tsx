import { notFound } from "next/navigation";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { renderWikiHtml } from "@/lib/markdown";
import { normalizePath } from "@/lib/slug";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}) {
  const { lang, slug } = await params;
  const user = await getSessionUser();
  if (!env.PUBLIC_READ_MODE && !user) return notFound();

  const path = normalizePath(lang, slug);
  const cacheKey = `wiki:${lang}:${slug.join("/")}`;
  const cached = await getCached(cacheKey);

  let html: string;
  let title = "";
  if (cached) {
    const parsed = JSON.parse(cached) as { title: string; html: string };
    title = parsed.title;
    html = parsed.html;
  } else {
    const page = await prisma.page.findUnique({ where: { path } });
    if (!page || !page.isPublished) return notFound();
    title = page.title;
    html = await renderWikiHtml(page.contentMd, lang);
    await setCached(cacheKey, JSON.stringify({ title, html }));
  }

  return (
    <WikiRepositoryLayout lang={lang} activeWikiPath={path} isAdmin={!!user && user.role === "admin"}>
      <article style={{ maxWidth: 900 }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <div style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </WikiRepositoryLayout>
  );
}
