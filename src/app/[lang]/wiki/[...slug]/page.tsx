import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";
import type { EditableWikiPage } from "@/components/wiki-inline-edit-types";
import { WikiArticleFooter } from "@/components/wiki-article-footer";
import { WikiEditableArticle } from "@/components/wiki-editable-article";
import { WikiBreadcrumbs } from "@/components/wiki-breadcrumbs";
import { WikiClonePageForm } from "@/components/wiki-clone-page-form";
import { WikiCollectionView } from "@/components/wiki-collection-view";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";
import { getCached, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { wikiPageWhere } from "@/lib/page-query";
import { getWikiShellProps } from "@/lib/wiki-shell-props";
import { env } from "@/lib/env";
import { getDictionary, safeLangAsync } from "@/lib/i18n";
import { getEnabledLanguages } from "@/lib/site-config";
import { renderWikiHtml } from "@/lib/markdown";
import { normalizePath } from "@/lib/slug";
import { findActiveRedirect, maybePurgeExpiredRedirects } from "@/lib/page-redirect";
import { wikiPublicHref } from "@/lib/wiki-path";
import {
  breadcrumbChain,
  breadcrumbChainForPage,
  collectionDescription,
  collectionTitle,
  findCollectionNode,
  formatWikiDate,
  getExcerptByPath,
  getLangPathTree,
  getWikiNodeType,
  hasPublishedPage,
} from "@/lib/wiki-collection";

function wikiPagePath(lang: string, slug: string[]): string {
  return `/${lang}/wiki/${slug.join("/")}`;
}

function wikiCanonicalUrl(pagePath: string): string {
  const base = env.APP_URL.replace(/\/$/, "");
  return `${base}${pagePath}`;
}

async function loadCatalogBodyHtml(
  lang: string,
  slug: string[],
  page: { title: string; contentMd: string },
): Promise<string> {
  const cacheKey = `wiki-catalog:${lang}:${slug.join("/")}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as { html: string };
    return parsed.html;
  }
  const html = await renderWikiHtml(page.contentMd, lang);
  await setCached(cacheKey, JSON.stringify({ title: page.title, html }));
  return html;
}

async function loadArticleHtml(
  lang: string,
  slug: string[],
  page: { title: string; contentMd: string },
): Promise<{ title: string; html: string }> {
  const cacheKey = `wiki:${lang}:${slug.join("/")}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return JSON.parse(cached) as { title: string; html: string };
  }
  const title = page.title;
  const html = await renderWikiHtml(page.contentMd, lang);
  await setCached(cacheKey, JSON.stringify({ title, html }));
  return { title, html };
}

function toEditablePage(
  page: {
    id: string;
    title: string;
    contentMd: string;
    path: string;
    systemKey: string | null;
    isPublished: boolean;
  },
  lang: string,
): EditableWikiPage {
  return {
    id: page.id,
    lang,
    title: page.title,
    contentMd: page.contentMd,
    path: page.path,
    systemKey: page.systemKey,
    isPublished: page.isPublished,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}): Promise<Metadata> {
  const { lang: inputLang, slug } = await params;
  const lang = await safeLangAsync(inputLang);
  const path = normalizePath(lang, slug);
  const pagePath = wikiPagePath(lang, slug);

  const [page, tree, excerptByPath, dict] = await Promise.all([
    prisma.page.findFirst({
      where: { lang, path, ...wikiPageWhere },
      select: { title: true, excerpt: true, isPublished: true },
    }),
    getLangPathTree(lang),
    getExcerptByPath(lang),
    getDictionary(lang),
  ]);

  const node = findCollectionNode(tree, path);
  const nodeType = getWikiNodeType(node);

  if (nodeType === "catalog" && node) {
    return {
      title: collectionTitle(node),
      description: collectionDescription(node, dict.collection.defaultDescription, excerptByPath),
      alternates: { canonical: wikiCanonicalUrl(pagePath) },
    };
  }

  if (nodeType === "article" && page?.isPublished) {
    return {
      title: page.title,
      description: page.excerpt ?? undefined,
      alternates: { canonical: wikiCanonicalUrl(pagePath) },
    };
  }

  return { title: "Not found" };
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string[] }>;
}) {
  const { lang: inputLang, slug } = await params;
  const [enabledLanguages, lang] = await Promise.all([getEnabledLanguages(), safeLangAsync(inputLang)]);
  const user = await getSessionUser();
  if (!env.PUBLIC_READ_MODE && !user) return notFound();

  const path = normalizePath(lang, slug);
  const pagePath = wikiPagePath(lang, slug);

  maybePurgeExpiredRedirects();
  const activeRedirect = await findActiveRedirect(lang, path);
  if (activeRedirect) {
    redirect(wikiPublicHref(lang, activeRedirect.toPath));
  }

  const isAdmin = !!user && isAdminRole(user.role);

  const [page, tree, excerptByPath, dict] = await Promise.all([
    prisma.page.findFirst({ where: { lang, path, ...wikiPageWhere } }),
    getLangPathTree(lang),
    getExcerptByPath(lang),
    getDictionary(lang),
  ]);

  const node = findCollectionNode(tree, path);
  const nodeType = getWikiNodeType(node);

  if (nodeType === "catalog" && node) {
    const shell = await getWikiShellProps(lang);
    const crumbs = breadcrumbChain(node, lang, tree, dict.collection.allCollections);
    const canShowBody = page && (hasPublishedPage(page) || isAdmin) && page.contentMd.trim();
    const bodyHtml = canShowBody ? await loadCatalogBodyHtml(lang, slug, page) : undefined;

    return (
      <WikiPublicShell {...shell} variant={bodyHtml ? "compact" : "home"}>
        <WikiBreadcrumbs items={crumbs} pagePath={pagePath} />
        <WikiCollectionView
          node={node}
          lang={lang}
          excerptByPath={excerptByPath}
          dict={dict.collection}
          bodyHtml={bodyHtml}
          pagePath={pagePath}
          editablePage={canShowBody && isAdmin ? toEditablePage(page, lang) : undefined}
          fullDict={isAdmin ? dict : undefined}
        />
      </WikiPublicShell>
    );
  }

  if (nodeType === "article" && page && (hasPublishedPage(page) || isAdmin)) {
    const { title, html } = await loadArticleHtml(lang, slug, page);
    const shell = await getWikiShellProps(lang);
    const crumbs = breadcrumbChainForPage(path, title, lang, tree, dict.collection.allCollections);
    const dateLabel = dict.collection.updatedAt.replace(
      "{date}",
      formatWikiDate(page.updatedAt, lang),
    );

    return (
      <WikiPublicShell {...shell} variant="compact">
        <WikiBreadcrumbs items={crumbs} pagePath={pagePath} />
        <WikiEditableArticle
          variant="article"
          page={toEditablePage(page, lang)}
          lang={lang}
          html={html}
          dateLabel={dateLabel}
          updatedAt={page.updatedAt.toISOString()}
          dict={dict}
          footer={
            <WikiArticleFooter
              page={{ id: page.id, path: page.path }}
              lang={lang}
              tree={tree}
              user={user}
              dict={dict.article}
            />
          }
        />
      </WikiPublicShell>
    );
  }

  if (page && !hasPublishedPage(page) && !isAdmin) return notFound();

  if (!isAdmin) return notFound();

  const candidates = enabledLanguages
    .filter((l) => l !== lang)
    .map((l) => ({ lang: l, path: normalizePath(l, slug) }));
  const existing = await prisma.page.findMany({
    where: {
      ...wikiPageWhere,
      OR: candidates.map((c) => ({ lang: c.lang, path: c.path })),
    },
    select: { lang: true, path: true, title: true, isPublished: true },
    take: candidates.length,
  });
  const existingByLang = new Map(existing.map((p) => [p.lang, p] as const));
  const source = existing.find((p) => p.isPublished) ?? existing[0];

  return (
    <WikiRepositoryLayout lang={lang} activeWikiPath={path} isAdmin mode="admin">
      <article className="wiki-missing-page">
        <div className="wiki-missing-page-mascot">
          <HekotiMascotLink lang={lang} className="wiki-missing-mascot" imageSize={72} />
        </div>
        <h1>{dict.admin.wiki.missingTitle}</h1>
        <p className="wiki-missing-page-desc">{dict.admin.wiki.missingDesc.replace("{path}", pagePath)}</p>

        <div className="wiki-missing-page-body">
          <div className="wiki-missing-page-label">{dict.admin.wiki.availableIn}</div>
          <div className="wiki-missing-page-langs">
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
                    className="wiki-missing-page-lang-link"
                  >
                    {l.toUpperCase()}: {hit.title}
                  </Link>
                );
              })}
          </div>

          {source ? (
            <WikiClonePageForm
              sourcePath={source.path}
              targetLang={lang}
              label={dict.admin.wiki.createFrom.replace("{lang}", source.lang.toUpperCase())}
              note={dict.admin.wiki.createNote}
            />
          ) : (
            <div className="wiki-missing-page-no-source">{dict.admin.wiki.noSource}</div>
          )}
        </div>
      </article>
    </WikiRepositoryLayout>
  );
}
