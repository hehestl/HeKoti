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
      <div className="container" style={{ flex: 1, width: "100%" }}>
        {children}
      </div>
      <FloatingDonate lang={lang} />
      <footer style={{ padding: 16, borderTop: "1px solid var(--line)", color: "var(--muted)" }}>
        Разработано и создано by @hehestl | https://t.me/hehestl | https://github.com/hehestl |
        {" "}https://t.me/PhiloraBot
      </footer>
    </div>
  );
}
