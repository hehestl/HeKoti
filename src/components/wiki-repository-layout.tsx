import Link from "next/link";
import { WikiPageRow } from "@/components/wiki-page-row";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";

/** First path segment after /{lang}/ — like a Snibox “label”. */
function sectionKey(path: string, lang: string): string | null {
  const prefix = `/${lang}/`;
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length);
  const seg = rest.split("/").filter(Boolean)[0];
  return seg ?? null;
}

/** DB paths are /{lang}/…; public URLs live under /{lang}/wiki/…. */
function wikiHref(lang: string, path: string) {
  const prefix = `/${lang}/`;
  if (!path.startsWith(prefix)) return `/${lang}`;
  const tail = path.slice(prefix.length);
  return `/${lang}/wiki/${tail}`;
}

export async function WikiRepositoryLayout({
  lang,
  children,
  q,
  section,
  activeWikiPath,
  isAdmin = false,
}: {
  lang: string;
  children: React.ReactNode;
  q?: string;
  section?: string;
  /** DB `page.path` for the open wiki page, to highlight in the list */
  activeWikiPath?: string;
  /** Context menu: delete / move up — only for authorized admin */
  isAdmin?: boolean;
}) {
  /** Section from URL (?section=) or the first path segment of the current page (/en/h1/h2 → h1). */
  const derivedFromOpenPage = activeWikiPath ? sectionKey(activeWikiPath, lang) : null;
  const filterSection = (section && section.length > 0 ? section : derivedFromOpenPage) || undefined;
  const allPagesActive = !filterSection;

  const sectionWhere =
    filterSection && filterSection.length > 0
      ? {
          OR: [{ path: `/${lang}/${filterSection}` }, { path: { startsWith: `/${lang}/${filterSection}/` } }],
        }
      : {};

  const searchWhere = q
    ? {
        OR: [{ title: { contains: q, mode: "insensitive" as const } }, { contentMd: { contains: q, mode: "insensitive" as const } }],
      }
    : {};

  const listPages = await prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...searchWhere,
      ...sectionWhere,
    },
    orderBy: q ? { updatedAt: "desc" } : [{ navOrder: "asc" }, { title: "asc" }],
    take: q ? 80 : 400,
    select: { id: true, title: true, path: true },
  });

  const pathRows = await prisma.page.findMany({
    where: { lang, isPublished: true },
    select: { path: true },
    take: 800,
  });

  const sectionSlugs = Array.from(
    new Set(
      pathRows
        .map((row) => sectionKey(row.path, lang))
        .filter((key): key is string => Boolean(key)),
    ),
  );

  const sectionRootPaths = sectionSlugs.map((slug) => `/${lang}/${slug}`);
  const sectionRoots = await prisma.page.findMany({
    where: { lang, isPublished: true, path: { in: sectionRootPaths } },
    select: { path: true, title: true },
    take: sectionRootPaths.length,
  });
  const sectionTitleBySlug = new Map(
    sectionRoots.map((row) => [sectionKey(row.path, lang) ?? "", row.title] as const).filter(([k]) => Boolean(k)),
  );

  const sectionSamples = await prisma.page.findMany({
    where: { lang, isPublished: true, OR: sectionSlugs.map((slug) => ({ path: { startsWith: `/${lang}/${slug}/` } })) },
    orderBy: [{ navOrder: "asc" }, { title: "asc" }],
    select: { path: true, title: true },
    take: 800,
  });
  const sectionSampleTitleBySlug = new Map<string, string>();
  for (const row of sectionSamples) {
    const slug = sectionKey(row.path, lang);
    if (!slug) continue;
    if (sectionSampleTitleBySlug.has(slug)) continue;
    sectionSampleTitleBySlug.set(slug, row.title);
  }

  const sectionLabelBySlug = new Map<string, string>();
  for (const slug of sectionSlugs) {
    sectionLabelBySlug.set(slug, sectionTitleBySlug.get(slug) ?? sectionSampleTitleBySlug.get(slug) ?? slug);
  }

  const sections = sectionSlugs
    .map((slug) => ({ slug, label: sectionLabelBySlug.get(slug) ?? slug }))
    .sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: "base" }));

  const base = `/${lang}`;
  const dict = await getDictionary(lang);
  const filterSectionLabel = filterSection ? sectionLabelBySlug.get(filterSection) ?? filterSection : undefined;

  return (
    <div className="repo-layout">
      <aside className="repo-sidebar repo-sidebar-labels">
        <div className="repo-sidebar-head">{dict.admin.wiki.sections}</div>
        <nav className="repo-sidebar-nav" aria-label={dict.common.sectionsAria}>
          <Link href={base} className={`repo-sidebar-link${allPagesActive ? " repo-sidebar-link-active" : ""}`} prefetch={false}>
            {dict.admin.wiki.allPages}
          </Link>
          {sections.map(({ slug, label }) => {
            const href = `${base}?section=${encodeURIComponent(slug)}`;
            const active = filterSection === slug;
            return (
              <Link key={slug} href={href} className={`repo-sidebar-link${active ? " repo-sidebar-link-active" : ""}`} prefetch={false}>
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="repo-sidebar repo-sidebar-snippets">
        <div className="repo-sidebar-head">
          {q
            ? dict.admin.wiki.search.replace("{q}", q)
            : filterSection
            ? dict.admin.wiki.inSection.replace("{section}", filterSectionLabel ?? filterSection)
            : dict.admin.wiki.pages}
        </div>
        <ul className="repo-page-list">
          {listPages.map((item) => {
            const href = wikiHref(lang, item.path);
            const active = activeWikiPath === item.path;
            return (
              <WikiPageRow
                key={item.id}
                id={item.id}
                href={href}
                title={item.title}
                lang={lang}
                isAdmin={isAdmin}
                isActive={active}
                dict={dict}
              />
            );
          })}
          {listPages.length === 0 ? <li className="repo-page-empty">{dict.admin.wiki.noPagesMatch}</li> : null}
        </ul>
      </aside>

      <main className="repo-main">{children}</main>
    </div>
  );
}
