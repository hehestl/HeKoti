import { TopBar } from "@/components/topbar";
import { getSessionUser } from "@/lib/auth";
import { aiLinks } from "@/lib/ai-links";
import { enabledLanguages, safeLang, getDictionary } from "@/lib/i18n";

export default async function LocaleLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  const dict = await getDictionary(lang);
  const user = await getSessionUser();
  const adminUser = user?.role === "admin" ? { login: user.email } : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar
        lang={lang}
        ai={aiLinks}
        langs={enabledLanguages.map((code) => ({ code, label: code.toUpperCase() }))}
        adminUser={adminUser}
        dict={dict.common}
      />
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: "0 clamp(12px, 2vw, 28px)",
        }}
      >
        {children}
      </div>
      <footer
        style={{
          padding: "12px clamp(12px, 2vw, 28px)",
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 14px",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1.5,
          }}
        >
          <span>{dict.common.developedBy}</span>
          <a href="https://t.me/hehestl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            @hehestl
          </a>
          <span aria-hidden>·</span>
          <a href="https://github.com/hehestl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            {dict.common.github}
          </a>
          <span aria-hidden>·</span>
          <a href="https://t.me/PhiloraBot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            {dict.common.support}
          </a>
        </div>
      </footer>
    </div>
  );
}
