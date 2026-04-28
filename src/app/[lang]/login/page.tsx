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
        <p style={{ color: "var(--muted)", marginTop: -6, marginBottom: 12, fontSize: 12, lineHeight: 1.45 }}>
          Docker: после первого старта логин по умолчанию <strong>admin</strong> / <strong>hehe</strong> (если в БД ещё не было
          пользователей). Смените в админке → Account. Если уже был другой админ — задайте{" "}
          <code style={{ fontSize: 11 }}>HEKOTI_FORCE_ADMIN_RESET=1</code> и перезапустите контейнер.
        </p>
        <LoginForm lang={lang} />
      </section>
    </main>
  );
}
