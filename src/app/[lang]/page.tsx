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
    <main className="home-grid">
      <aside style={sidePanelStyle}>
        <h3 style={sideHeadingStyle}>Sections</h3>
        <p style={sideMutedStyle}>Wiki outline</p>
      </aside>
      <section style={sidePanelStyle}>
        <h3 style={sideHeadingStyle}>{q ? `Search: ${q}` : "Latest pages"}</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 6 }}>
          {pages.map((item) => (
            <li key={item.id}>
              <Link href={`/${lang}/wiki/${item.path.split("/").slice(2).join("/")}`} style={{ color: "var(--accent)", fontSize: 13 }}>
                {item.title}
              </Link>
            </li>
          ))}
          {pages.length === 0 ? <li style={{ color: "var(--muted)", fontSize: 13 }}>No pages found.</li> : null}
        </ul>
      </section>
      <section style={mainPanelStyle}>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.35rem, 2vw, 1.75rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Hekotia
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)", lineHeight: 1.65, maxWidth: "62ch" }}>
          Hekoti — self-hosted public wiki archive. Ask Hekoti and knowledge awakens.
        </p>
      </section>
    </main>
  );
}

const sidePanelStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "8px 10px",
  background: "var(--panel)",
  minHeight: 0,
};

const sideHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
};

const sideMutedStyle: React.CSSProperties = {
  color: "var(--muted)",
  margin: "6px 0 0",
  fontSize: 12,
  lineHeight: 1.45,
};

const mainPanelStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "clamp(16px, 2.5vw, 28px)",
  background: "var(--panel)",
  minHeight: "min(60vh, 520px)",
  width: "100%",
};
