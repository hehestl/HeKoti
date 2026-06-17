import { LoginForm } from "@/components/login-form";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { redirectIfAuthenticated } from "@/lib/auth-routes";
import { safeLang, getDictionary } from "@/lib/i18n";
import { getWikiShellProps } from "@/lib/wiki-shell-props";

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  await redirectIfAuthenticated(lang);
  const [dict, shell] = await Promise.all([getDictionary(lang), getWikiShellProps(lang)]);

  return (
    <WikiPublicShell {...shell} variant="compact">
      <main style={{ display: "grid", placeItems: "center", minHeight: "50vh", padding: 12 }}>
        <section
          style={{
            width: "100%",
            maxWidth: 420,
            border: "1px solid var(--line)",
            borderRadius: 14,
            background: "var(--panel)",
            padding: 16,
          }}
        >
          <h1>{dict.admin.auth.adminLogin}</h1>
          <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 12 }}>
            {dict.admin.auth.publicInfo}
          </p>
          <p style={{ color: "var(--muted)", marginTop: -6, marginBottom: 12, fontSize: 12, lineHeight: 1.45 }}>
            {dict.admin.auth.dockerInfo}
          </p>
          <LoginForm lang={lang} dict={dict} />
        </section>
      </main>
    </WikiPublicShell>
  );
}
