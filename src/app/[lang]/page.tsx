import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { safeLang } from "@/lib/i18n";

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
  const user = await getSessionUser();
  if (!env.PUBLIC_READ_MODE && !user) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Private wiki</h1>
        <p>Login required.</p>
        <Link href={`/${lang}/login`} style={{ color: "var(--accent)" }}>
          Go to login
        </Link>
      </main>
    );
  }

  const pages = await prisma.page.findMany({
    where: {
      lang,
      isPublished: true,
      ...(q
        ? {
            OR: [{ title: { contains: q, mode: "insensitive" } }, { contentMd: { contains: q, mode: "insensitive" } }],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });

  return (
    <main style={{ display: "grid", gridTemplateColumns: "240px 320px 1fr", gap: 12, padding: 12 }}>
      <aside style={panelStyle}>
        <h3>Sections</h3>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Public wiki explorer</p>
      </aside>
      <section style={panelStyle}>
        <h3>{q ? `Search: ${q}` : "Latest pages"}</h3>
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12, display: "grid", gap: 8 }}>
          {pages.map((item) => (
            <li key={item.id}>
              <Link href={`/${lang}/wiki/${item.path.split("/").slice(2).join("/")}`} style={{ color: "var(--accent)" }}>
                {item.title}
              </Link>
            </li>
          ))}
          {pages.length === 0 ? <li style={{ color: "var(--muted)" }}>No pages found.</li> : null}
        </ul>
      </section>
      <section style={panelStyle}>
        <h2>Hekotia</h2>
        <p style={{ color: "var(--muted)" }}>
          Hekoti — self-hosted public wiki archive. Ask Hekoti and knowledge awakens.
        </p>
      </section>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 12,
  background: "var(--panel)",
  minHeight: 420,
};
