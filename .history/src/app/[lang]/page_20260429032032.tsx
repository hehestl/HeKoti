import Link from "next/link";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeLang, getDictionary } from "@/lib/i18n";

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

  return (
    <WikiRepositoryLayout lang={lang} q={q} section={section} isAdmin={!!user && user.role === "admin"}>
      <div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.35rem, 2vw, 1.75rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
          {dict.home.title}
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)", lineHeight: 1.65, maxWidth: "62ch" }}>
          {dict.home.description}
        </p>
      </div>
    </WikiRepositoryLayout>
  );
}
