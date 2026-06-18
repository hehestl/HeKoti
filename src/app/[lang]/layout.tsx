import Link from "next/link";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";
import { SiteFooterControls } from "@/components/site-footer-controls";
import { safeLang, getDictionary } from "@/lib/i18n";

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

  return (
    <div className="site-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <HekotiMascotLink lang={lang} className="site-layout-mascot" />
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {children}
      </div>
      <footer className="site-footer">
        <div className="site-footer-links">
          <Link href={`/${lang}`}>{dict.common.developedBy}</Link>
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
          labels={{
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
