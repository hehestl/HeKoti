import { WikiPageRow } from "@/components/wiki-page-row";
import { WikiPageTree, type WikiTreePageBrief } from "@/components/wiki-page-tree";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { buildPathTree } from "@/lib/page-tree";
import { buildSearchWhere, parseSearchTerms } from "@/lib/wiki-search";

export async function WikiRepositoryLayout({
  lang,
  children,
  q,
  activeWikiPath,
  isAdmin = false,
  mode = "admin",
}: {
  lang: string;
  children: React.ReactNode;
  q?: string;
  /** @deprecated Sections column removed — kept for callers compatibility (ignored). */
  section?: string;
  /** DB `page.path` for the open wiki page, to highlight in the list */
  activeWikiPath?: string;
  /** Context menu: delete / move up — only for authorized admin */
  isAdmin?: boolean;
  /** public — no sidebar; admin — sidebar + tree */
  mode?: "public" | "admin";
}) {
  if (mode === "public") {
    return <main className="repo-main repo-main-full">{children}</main>;
  }

  const qTrim = q?.trim() ?? "";
  const terms = parseSearchTerms(qTrim);
  const searchMode = terms.length > 0;

  const listPages = await prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...buildSearchWhere(terms),
    },
    orderBy: searchMode ? { updatedAt: "desc" } : [{ navOrder: "asc" }, { title: "asc" }],
    take: searchMode ? 80 : 600,
    select: { id: true, title: true, path: true, navOrder: true },
  });

  /** DB paths are /{lang}/…; public URLs live under /{lang}/wiki/…. */
  function wikiHref(path: string) {
    const prefix = `/${lang}/`;
    if (!path.startsWith(prefix)) return `/${lang}`;
    const tail = path.slice(prefix.length);
    return `/${lang}/wiki/${tail}`;
  }

  const dict = await getDictionary(lang);
  const pathTree = buildPathTree(listPages satisfies WikiTreePageBrief[], lang);

  return (
    <div className="repo-layout">
      <aside className="repo-sidebar repo-sidebar-wiki">
        <div className="repo-sidebar-head">
          {searchMode ? dict.admin.wiki.search.replace("{q}", qTrim) : dict.admin.wiki.pages}
        </div>
        <div className="repo-sidebar-scroll repo-sidebar-scroll-subtle">
          {searchMode ? (
            <ul className="repo-page-list">
              {listPages.map((item) => {
                const href = wikiHref(item.path);
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
          ) : (
            <WikiPageTree
              nodes={pathTree}
              lang={lang}
              activeWikiPath={activeWikiPath}
              isAdmin={isAdmin}
              dict={dict}
            />
          )}
        </div>
      </aside>

      <main className="repo-main">{children}</main>
    </div>
  );
}
