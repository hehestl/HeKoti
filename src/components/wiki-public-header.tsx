"use client";

import { Suspense } from "react";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";
import { HelpCenterSearchForm } from "@/components/help-center-search-form";
import { LanguageSwitch, LanguageSwitchFallback } from "@/components/language-switch";

type LangOption = { code: string; label: string };

export type WikiPublicHeaderVariant = "home" | "compact";

export function WikiPublicHeader({
  lang,
  langs,
  searchPlaceholder,
  languageAria,
  variant,
  initialSearchQuery = "",
}: {
  lang: string;
  langs: LangOption[];
  searchPlaceholder: string;
  languageAria: string;
  variant: WikiPublicHeaderVariant;
  initialSearchQuery?: string;
}) {
  return (
    <header className="wiki-public-header">
      <div className="wiki-public-header-inner">
        <HekotiMascotLink
          lang={lang}
          className="wiki-public-header-mascot"
          priority={variant === "home"}
        />
        <div className="wiki-public-header-search">
          <HelpCenterSearchForm
            lang={lang}
            placeholder={searchPlaceholder}
            initialQuery={initialSearchQuery}
          />
        </div>
        <Suspense fallback={<LanguageSwitchFallback lang={lang} langs={langs} />}>
          <LanguageSwitch lang={lang} langs={langs} groupAria={languageAria} />
        </Suspense>
      </div>
    </header>
  );
}
