"use client";

import { Suspense } from "react";
import { HekotiMascotMenu } from "@/components/hekoti-mascot-menu";
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
  isAdmin = false,
  appVersion,
  adminLabel,
  versionLabel,
  editLabel,
  exitEditLabel,
}: {
  lang: string;
  langs: LangOption[];
  searchPlaceholder: string;
  languageAria: string;
  variant: WikiPublicHeaderVariant;
  initialSearchQuery?: string;
  isAdmin?: boolean;
  appVersion?: string;
  adminLabel: string;
  versionLabel: string;
  editLabel?: string;
  exitEditLabel?: string;
}) {
  return (
    <header className="wiki-public-header">
      <div className="wiki-public-header-inner">
        <HekotiMascotMenu
          lang={lang}
          isAdmin={isAdmin}
          appVersion={appVersion}
          className="wiki-public-header-mascot"
          priority={variant === "home"}
          adminLabel={adminLabel}
          versionLabel={versionLabel}
          editLabel={editLabel}
          exitEditLabel={exitEditLabel}
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
