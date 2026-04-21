import { TopBar } from "@/components/topbar";
import { FloatingDonate } from "@/components/floating-donate";
import { aiLinks } from "@/lib/ai-links";
import { enabledLanguages, safeLang } from "@/lib/i18n";

export default async function LocaleLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar
        lang={lang}
        ai={aiLinks}
        langs={enabledLanguages.map((code) => ({ code, label: code.toUpperCase() }))}
      />
      <div style={{ flex: 1, width: "100%", maxWidth: "min(100%, 1680px)", margin: "0 auto", padding: "0 clamp(12px, 2vw, 28px)" }}>
        {children}
      </div>
      <FloatingDonate lang={lang} />
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
          <span>Разработано и создано</span>
          <a href="https://t.me/hehestl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            @hehestl
          </a>
          <span aria-hidden>·</span>
          <a href="https://github.com/hehestl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            GitHub
          </a>
          <span aria-hidden>·</span>
          <a href="https://t.me/PhiloraBot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            Поддержка
          </a>
        </div>
      </footer>
    </div>
  );
}
