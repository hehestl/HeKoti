import { LoginForm } from "@/components/login-form";
import { safeLang, getDictionary } from "@/lib/i18n";

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  const dict = await getDictionary(lang);
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "70vh", padding: 12 }}>
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
  );
}
