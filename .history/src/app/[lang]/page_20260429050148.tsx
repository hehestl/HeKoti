import Image from "next/image";
import Link from "next/link";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { safeLang, getDictionary } from "@/lib/i18n";

function wikiHref(lang: string, path: string) {
  const prefix = `/${lang}/`;
  if (!path.startsWith(prefix)) return `/${lang}`;
  const tail = path.slice(prefix.length);
  return `/${lang}/wiki/${tail}`;
}

export default async function LanguageHome({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; section?: string }>;
}) {
  const { lang: inputLang } = await params;
  const { q, section } = await searchParams;
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

  const [totalPages, recentPages] = await Promise.all([
    prisma.page.count({ where: { lang, isPublished: true } }),
    prisma.page.findMany({
      where: { lang, isPublished: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, path: true, updatedAt: true },
    }),
  ]);

  return (
    <WikiRepositoryLayout lang={lang} q={q} section={section} isAdmin={!!user && user.role === "admin"}>
      <div>
        <div className="home-hero">
          <div className="home-mascot" aria-hidden>
            <Image src="/hekoti.png" alt="" width={160} height={160} priority />
          </div>
          <div>
            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.35rem, 2vw, 1.75rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {dict.home.title}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)", lineHeight: 1.65, maxWidth: "62ch" }}>
              {dict.home.description}
            </p>
          </div>
        </div>

        <div className="home-stats">
          <div className="home-stat-card">
            <div className="home-stat-title">{dict.home.pagesCreated}</div>
            <div className="home-stat-value">{totalPages}</div>
          </div>

          <div className="home-stat-card">
            <div className="home-stat-title">{dict.home.newMaterials}</div>
            {recentPages.length > 0 ? (
              <ul className="home-updates">
                {recentPages.map((p) => (
                  <li key={p.id}>
                    <Link href={wikiHref(lang, p.path)} prefetch={false}>
                      {p.title}
                    </Link>{" "}
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>
                      {dict.home.updatedAt.replace(
                        "{date}",
                        p.updatedAt.toLocaleDateString(lang, { year: "numeric", month: "short", day: "2-digit" }),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>{dict.home.noMaterials}</div>
            )}
          </div>
        </div>
      </div>
    </WikiRepositoryLayout>
  );
}
