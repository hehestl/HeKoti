import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { WikiBreadcrumbs } from "@/components/wiki-breadcrumbs";
import { WikiPublicShell } from "@/components/wiki-public-shell";
import { isHeronSsoEnabled, redirectIfAuthenticated } from "@/lib/auth-routes";
import { buildAuthLoginPath } from "@/lib/heron-auth-client";
import { safeLang, getDictionary } from "@/lib/i18n";
import { staticBreadcrumbChain } from "@/lib/wiki-collection";
import { getWikiShellProps } from "@/lib/wiki-shell-props";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ local?: string }>;
}) {
  const { lang: inputLang } = await params;
  const { local: localParam } = await searchParams;
  const lang = safeLang(inputLang);
  await redirectIfAuthenticated(lang);

  const allowLocalLogin = localParam === "1";
  if (isHeronSsoEnabled() && !allowLocalLogin) {
    redirect(buildAuthLoginPath(`/${lang}/admin`, true));
  }

  const [dict, shell] = await Promise.all([getDictionary(lang), getWikiShellProps(lang)]);
  const heronEnabled = isHeronSsoEnabled();
  const heronLoginHref = buildAuthLoginPath(`/${lang}/admin`, true);

  return (
    <WikiPublicShell {...shell} variant="compact" languagePathSuffix="/login">
      <WikiBreadcrumbs
        items={staticBreadcrumbChain(lang, dict.collection.allCollections, dict.admin.auth.adminLogin)}
        pagePath={`/${lang}/login`}
      />
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
          {heronEnabled ? (
            <>
              <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 12 }}>
                {dict.admin.auth.heronHint}
              </p>
              <a
                href={heronLoginHref}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "var(--accent, #3b82f6)",
                  color: "#fff",
                  fontWeight: 600,
                  textDecoration: "none",
                  marginBottom: 16,
                }}
              >
                {dict.admin.auth.heronLogin}
              </a>
              <details>
                <summary style={{ cursor: "pointer", color: "var(--muted)", marginBottom: 12 }}>
                  {dict.admin.auth.emailFallback}
                </summary>
                <LoginForm lang={lang} dict={dict} />
              </details>
            </>
          ) : (
            <>
              <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 12 }}>
                {dict.admin.auth.publicInfo}
              </p>
              <p style={{ color: "var(--muted)", marginTop: -6, marginBottom: 12, fontSize: 12, lineHeight: 1.45 }}>
                {dict.admin.auth.dockerInfo}
              </p>
              <LoginForm lang={lang} dict={dict} />
            </>
          )}
        </section>
      </main>
    </WikiPublicShell>
  );
}
