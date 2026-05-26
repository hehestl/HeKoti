"use client";

import { LanguageSwitch } from "@/components/language-switch";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";

type LangOption = { code: string; label: string };

export function SiteFooterControls({
  lang,
  langs,
  labels,
}: {
  lang: string;
  langs: LangOption[];
  labels: {
    languageAria: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    themeModeAria: string;
  };
}) {
  return (
    <div className="site-footer-controls">
      <LanguageSwitch lang={lang} langs={langs} groupAria={labels.languageAria} />
      <ThemeModeToggle
        labels={{
          light: labels.themeLight,
          dark: labels.themeDark,
          system: labels.themeSystem,
          groupAria: labels.themeModeAria,
        }}
      />
    </div>
  );
}
