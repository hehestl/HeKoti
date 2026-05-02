import { notFound } from "next/navigation";
import Link from "next/link";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { enabledLanguages, getDictionary } from "@/lib/i18n";
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
    if (!page || !page.isPublished) {
      if (!user || user.role !== "admin") return notFound();

      const dict = await getDictionary(lang);
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
        <WikiRepositoryLayout lang={lang} activeWikiPath={path} isAdmin>
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
