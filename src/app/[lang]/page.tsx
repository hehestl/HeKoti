import Link from "next/link";
import { WikiRepositoryLayout } from "@/components/wiki-repository-layout";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeLang } from "@/lib/i18n";

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

  return (
    <WikiRepositoryLayout lang={lang} q={q} section={section} isAdmin={!!user && user.role === "admin"}>
      <div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.35rem, 2vw, 1.75rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Hekotia
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)", lineHeight: 1.65, maxWidth: "62ch" }}>
          Hekoti — self-hosted public wiki archive. Ask Hekoti and knowledge awakens.
        </p>
      </div>
    </WikiRepositoryLayout>
  );
}
