import Link from "next/link";
import { TopBar } from "@/components/topbar";
import { SiteFooterControls } from "@/components/site-footer-controls";
import { getSessionUser } from "@/lib/auth";
import { aiLinks } from "@/lib/ai-links";
import { enabledLanguages, safeLang, getDictionary } from "@/lib/i18n";
import { languageSwitcherOptions } from "@/lib/language-labels";

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
      <TopBar lang={lang} ai={aiLinks} adminUser={adminUser} dict={dict.common} />
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: 0,
        }}
      >
        {children}
      </div>
      <footer className="site-footer">
        <div className="site-footer-links">
          <span>{dict.common.developedBy}</span>
          <a href="https://t.me/hehestl" target="_blank" rel="noopener noreferrer">
            @hehestl
          </a>
          <span aria-hidden>·</span>
          <a href="https://github.com/hehestl" target="_blank" rel="noopener noreferrer">
            {dict.common.github}
          </a>
          <span aria-hidden>·</span>
          <a href="https://t.me/PhiloraBot" target="_blank" rel="noopener noreferrer">
            {dict.common.support}
          </a>
          <span aria-hidden>·</span>
          <Link href={`/${lang}/donate`}>{dict.common.donate}</Link>
        </div>
        <SiteFooterControls
          lang={lang}
          langs={languageSwitcherOptions(enabledLanguages)}
          labels={{
            languageAria: dict.common.languageAria,
            themeLight: dict.common.themeLight,
            themeDark: dict.common.themeDark,
            themeSystem: dict.common.themeSystem,
            themeModeAria: dict.common.themeModeAria,
          }}
        />
      </footer>
    </div>
  );
}
