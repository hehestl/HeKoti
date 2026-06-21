import { HelpCenterHome } from "@/components/help-center-home";
import { HelpCenterHomeView } from "@/components/help-center-home-view";
import { WikiBreadcrumbs } from "@/components/wiki-breadcrumbs";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { WikiSearchResults } from "@/components/wiki-search-results";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeLang, getDictionary } from "@/lib/i18n";
import { getExcerptByPath, getLangPathTree, getSamplePageTitles } from "@/lib/wiki-collection";
import { getWikiShellProps } from "@/lib/wiki-shell-props";
import { searchPublishedPagesWithFallback } from "@/lib/wiki-search";
import Link from "next/link";

export default async function LanguageHome({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lang: inputLang } = await params;
  const { q } = await searchParams;
  const lang = safeLang(inputLang);
  const dict = await getDictionary(lang);
  const user = await getSessionUser();
  if (!env.PUBLIC_READ_MODE && !user) {
    return (
      <main style={{ padding: 20 }}>
        <h1>{dict.home.privateWiki}</h1>
        <p>{dict.home.loginRequired}</p>
        <Link href={`/${lang}/login`} style={{ color: "var(--accent)" }}>
          {dict.home.goToLogin}
        </Link>
      </main>
    );
  }

  const qTrim = q?.trim() ?? "";
  const searchMode = qTrim.length > 0;
  const shell = await getWikiShellProps(lang);

  const [pathTree, excerptByPath, searchBundle, sampleTitles] = await Promise.all([
    getLangPathTree(lang),
    getExcerptByPath(lang),
    searchMode ? searchPublishedPagesWithFallback(lang, qTrim) : Promise.resolve({ results: [], partial: false }),
    getSamplePageTitles(lang),
  ]);
  const searchResults = searchBundle.results;
  const searchPartial = searchBundle.partial;

  const searchCrumbs = [
    { label: dict.collection.allCollections, href: `/${lang}` },
    { label: dict.search.breadcrumbLabel },
  ];

  return (
    <WikiPublicShell
      {...shell}
      variant={searchMode ? "compact" : "home"}
      initialSearchQuery={searchMode ? qTrim : undefined}
      searchSampleTitles={sampleTitles}
      enableTypewriterPlaceholder={!searchMode}
      languageQuery={searchMode ? `q=${encodeURIComponent(qTrim)}` : ""}
    >
      {searchMode ? (
        <>
          <WikiBreadcrumbs
            items={searchCrumbs}
            pagePath={`/${lang}?q=${encodeURIComponent(qTrim)}`}
          />
          <WikiSearchResults
            lang={lang}
            query={qTrim}
            results={searchResults}
            partial={searchPartial}
            dict={dict.search}
          />
        </>
      ) : (
        <HelpCenterHomeView lang={lang} pathTree={pathTree} searchMode={false}>
          <HelpCenterHome
            lang={lang}
            themes={pathTree}
            excerptByPath={excerptByPath}
            defaultDescription={dict.collection.defaultDescription}
            dict={dict.home}
          />
        </HelpCenterHomeView>
      )}
    </WikiPublicShell>
  );
}
