import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WikiBreadcrumbs } from "@/components/wiki-breadcrumbs";
import { WikiCollectionView } from "@/components/wiki-collection-view";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { enabledLanguages, getDictionary, safeLang } from "@/lib/i18n";
import { renderWikiHtml } from "@/lib/markdown";
import { normalizePath } from "@/lib/slug";
import { getWikiShellProps } from "@/lib/wiki-shell-props";
import {
  breadcrumbChain,
  breadcrumbChainForPage,
  collectionDescription,
  collectionTitle,
  findCollectionNode,
  formatWikiDate,
  getExcerptByPath,
  getLangPathTree,
} from "@/lib/wiki-collection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}): Promise<Metadata> {
  const { lang: inputLang, slug } = await params;
  const lang = safeLang(inputLang);
  const path = normalizePath(lang, slug);
  const page = await prisma.page.findUnique({
    where: { path },
    select: { title: true, excerpt: true, isPublished: true },
  });

  if (page?.isPublished) {
    return {
      title: page.title,
      description: page.excerpt ?? undefined,
    };
  }

  const [tree, excerptByPath, dict] = await Promise.all([
    getLangPathTree(lang),
    getExcerptByPath(lang),
    getDictionary(lang),
  ]);
  const node = findCollectionNode(tree, path);
  if (node && node.children.length > 0) {
    return {
      title: collectionTitle(node),
      description: collectionDescription(node, dict.collection.defaultDescription, excerptByPath),
    };
  }

  return { title: "Not found" };
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}) {
  const { lang, slug } = await params;
  const user = await getSessionUser();
  if (!env.PUBLIC_READ_MODE && !user) return notFound();

  const path = normalizePath(lang, slug);
  const isAdmin = !!user && user.role === "admin";
  const page = await prisma.page.findUnique({ where: { path } });

  if (page?.isPublished) {
    const cacheKey = `wiki:${lang}:${slug.join("/")}`;
    const cached = await getCached(cacheKey);

    let html: string;
    let title: string;
    if (cached) {
      const parsed = JSON.parse(cached) as { title: string; html: string };
      title = parsed.title;
      html = parsed.html;
    } else {
      title = page.title;
      html = await renderWikiHtml(page.contentMd, lang);
      await setCached(cacheKey, JSON.stringify({ title, html }));
    }

    const [tree, dict, shell] = await Promise.all([
      getLangPathTree(lang),
      getDictionary(lang),
      getWikiShellProps(lang),
    ]);
    const crumbs = breadcrumbChainForPage(path, title, lang, tree, dict.collection.allCollections);
    const dateLabel = dict.collection.updatedAt.replace(
      "{date}",
      formatWikiDate(page.updatedAt, lang),
    );

    return (
      <WikiPublicShell {...shell} variant="compact">
        <WikiBreadcrumbs items={crumbs} />
        <article className="wiki-article">
          <h1 className="wiki-article-title">{title}</h1>
          <time className="wiki-article-date" dateTime={page.updatedAt.toISOString()}>
            {dateLabel}
          </time>
          <div className="wiki-article-body" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </WikiPublicShell>
    );
  }

  const [tree, excerptByPath, dict] = await Promise.all([
    getLangPathTree(lang),
    getExcerptByPath(lang),
    getDictionary(lang),
  ]);
  const node = findCollectionNode(tree, path);

  if (node && node.children.length > 0) {
    const shell = await getWikiShellProps(lang);
    const crumbs = breadcrumbChain(node, lang, tree, dict.collection.allCollections);

    return (
      <WikiPublicShell {...shell} variant="home">
        <WikiBreadcrumbs items={crumbs} />
        <WikiCollectionView
          node={node}
          lang={lang}
          excerptByPath={excerptByPath}
          dict={dict.collection}
        />
      </WikiPublicShell>
    );
  }

  if (!isAdmin) return notFound();

  const candidates = enabledLanguages
    .filter((l) => l !== lang)
    .map((l) => ({ lang: l, path: normalizePath(l, slug) }));
  const existing = await prisma.page.findMany({
    where: { OR: candidates.map((c) => ({ path: c.path })) },
    select: { lang: true, path: true, title: true, isPublished: true },
    take: candidates.length,
  });
  const existingByLang = new Map(existing.map((p) => [p.lang, p] as const));
  const source = existing.find((p) => p.isPublished) ?? existing[0];

  return (
    <WikiRepositoryLayout lang={lang} activeWikiPath={path} isAdmin mode="admin">
      <article style={{ maxWidth: 900 }}>
        <h1 style={{ marginTop: 0 }}>{dict.admin.wiki.missingTitle}</h1>
        <p style={{ color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
          {dict.admin.wiki.missingDesc.replace("{path}", `/${lang}/wiki/${slug.join("/")}`)}
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700 }}>{dict.admin.wiki.availableIn}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {enabledLanguages
              .filter((l) => l !== lang)
              .map((l) => {
                const hit = existingByLang.get(l);
                if (!hit) return null;
                const href = `/${l}/wiki/${slug.join("/")}`;
                return (
                  <Link
                    key={l}
                    href={href}
                    prefetch={false}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: "var(--panel)",
                      color: "var(--accent)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {l.toUpperCase()}: {hit.title}
                  </Link>
                );
              })}
          </div>

          {source ? (
            <form method="post" action="/api/pages" style={{ marginTop: 8 }}>
              <input type="hidden" name="sourcePath" value={source.path} />
              <input type="hidden" name="targetLang" value={lang} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/${lang}/admin?tab=posts&activePath=${encodeURIComponent(path)}`}
              />
              <button
                type="submit"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  background: "var(--accent)",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                {dict.admin.wiki.createFrom.replace("{lang}", source.lang.toUpperCase())}
              </button>
              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                {dict.admin.wiki.createNote}
              </div>
            </form>
          ) : (
            <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>{dict.admin.wiki.noSource}</div>
          )}
        </div>
      </article>
    </WikiRepositoryLayout>
  );
}
