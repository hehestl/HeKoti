"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
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
        {variant === "home" ? (
          <Link href={`/${lang}`} className="wiki-public-header-mascot" aria-label="Hekoti">
            <Image src="/hekoti.png" alt="" width={120} height={120} priority />
          </Link>
        ) : null}
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
