import { LoginForm } from "@/components/login-form";
import { safeLang } from "@/lib/i18n";

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
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
        <h1>Admin login</h1>
        <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 12 }}>
          Public users can read pages. Editing requires admin session.
        </p>
        <LoginForm lang={lang} />
      </section>
    </main>
  );
}
