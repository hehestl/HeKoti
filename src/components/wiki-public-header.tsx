"use client";

import { HekotiMascotMenu } from "@/components/hekoti-mascot-menu";
import { HelpCenterSearchForm } from "@/components/help-center-search-form";
import type { ReactNode } from "react";

export type WikiPublicHeaderVariant = "home" | "compact";

export function WikiPublicHeader({
  lang,
  searchPlaceholder,
  variant,
  initialSearchQuery,
  searchSampleTitles = [],
  enableTypewriterPlaceholder = false,
  isAdmin = false,
  appVersion,
  adminLabel,
  versionLabel,
  editLabel,
  exitEditLabel,
  inlineEditSource = "auto",
  languageSwitch,
}: {
  lang: string;
  searchPlaceholder: string;
  variant: WikiPublicHeaderVariant;
  initialSearchQuery?: string;
  searchSampleTitles?: string[];
  enableTypewriterPlaceholder?: boolean;
  isAdmin?: boolean;
  appVersion?: string;
  adminLabel: string;
  versionLabel: string;
  editLabel?: string;
  exitEditLabel?: string;
  inlineEditSource?: "donate" | "auto";
  languageSwitch: ReactNode;
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
          inlineEditSource={inlineEditSource}
        />
        <div className="wiki-public-header-search">
          <HelpCenterSearchForm
            lang={lang}
            placeholder={searchPlaceholder}
            initialQuery={initialSearchQuery}
            searchSampleTitles={searchSampleTitles}
            enableTypewriterPlaceholder={enableTypewriterPlaceholder}
          />
        </div>
        {languageSwitch}
      </div>
    </header>
  );
}
