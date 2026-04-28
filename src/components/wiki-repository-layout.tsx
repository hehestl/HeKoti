import Link from "next/link";
import { WikiPageRow } from "@/components/wiki-page-row";
import { prisma } from "@/lib/db";

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
  /** ПКМ: удалить / вверх — только для авторизованного админа */
  isAdmin?: boolean;
}) {
  /** Раздел из URL (?section=) или первый сегмент пути текущей страницы (/en/h1/h2 → h1). */
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

  const sections = Array.from(
    new Set(
      pathRows
        .map((row) => sectionKey(row.path, lang))
        .filter((key): key is string => Boolean(key)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const base = `/${lang}`;

  return (
    <div className="repo-layout">
      <aside className="repo-sidebar repo-sidebar-labels">
        <div className="repo-sidebar-head">Sections</div>
        <nav className="repo-sidebar-nav" aria-label="Wiki sections">
          <Link href={base} className={`repo-sidebar-link${allPagesActive ? " repo-sidebar-link-active" : ""}`} prefetch={false}>
            All pages
          </Link>
          {sections.map((name) => {
            const href = `${base}?section=${encodeURIComponent(name)}`;
            const active = filterSection === name;
            return (
              <Link key={name} href={href} className={`repo-sidebar-link${active ? " repo-sidebar-link-active" : ""}`} prefetch={false}>
                {name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="repo-sidebar repo-sidebar-snippets">
        <div className="repo-sidebar-head">
          {q ? `Search: ${q}` : filterSection ? `In “${filterSection}”` : "Pages"}
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
              />
            );
          })}
          {listPages.length === 0 ? <li className="repo-page-empty">No pages match.</li> : null}
        </ul>
      </aside>

      <main className="repo-main">{children}</main>
    </div>
  );
}
