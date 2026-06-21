import { WikiPublicShellClient } from "@/components/wiki-public-shell-client";
import { WikiPublicLanguageSwitch } from "@/components/wiki-public-language-switch";
import type { DonateInlineEditLabels } from "@/components/donate-inline-edit-types";
import type { HomeInlineEditLabels } from "@/components/home-inline-edit-types";
import type { WikiInlineEditLabels } from "@/components/wiki-inline-edit-types";
import type { HelpCenterSearchLabels } from "@/components/help-center-search-form";
import type { WikiPublicHeaderVariant } from "@/components/wiki-public-header";
import type { DonateConfig } from "@/lib/donate-config-shared";

type LangOption = { code: string; label: string };

export function WikiPublicShell({
  lang,
  langs,
  searchPlaceholder,
  searchLabels,
  languageAria,
  variant,
  initialSearchQuery,
  searchSampleTitles = [],
  enableTypewriterPlaceholder = false,
  isAdmin,
  appVersion,
  adminLabel,
  versionLabel,
  inlineEditLabels,
  homeInlineEditLabels,
  initialDonateConfig,
  donateEditLabels,
  diagramCopyLabel,
  diagramCopiedLabel,
  languagePathSuffix = "",
  languageQuery = "",
  children,
}: {
  lang: string;
  langs: LangOption[];
  searchPlaceholder: string;
  searchLabels: HelpCenterSearchLabels;
  languageAria: string;
  variant: WikiPublicHeaderVariant;
  initialSearchQuery?: string;
  searchSampleTitles?: string[];
  enableTypewriterPlaceholder?: boolean;
  isAdmin?: boolean;
  appVersion?: string;
  adminLabel: string;
  versionLabel: string;
  inlineEditLabels: WikiInlineEditLabels;
  homeInlineEditLabels?: HomeInlineEditLabels;
  initialDonateConfig?: DonateConfig;
  donateEditLabels?: DonateInlineEditLabels;
  diagramCopyLabel: string;
  diagramCopiedLabel: string;
  /** Path after /{lang} for language switcher hrefs, e.g. "/wiki/foo" or "/donate". */
  languagePathSuffix?: string;
  /** Raw query string without leading "?", e.g. "q=test". */
  languageQuery?: string;
  children: React.ReactNode;
}) {
  return (
    <WikiPublicShellClient
      lang={lang}
      searchPlaceholder={searchPlaceholder}
      searchLabels={searchLabels}
      variant={variant}
      initialSearchQuery={initialSearchQuery}
      searchSampleTitles={searchSampleTitles}
      enableTypewriterPlaceholder={enableTypewriterPlaceholder}
      isAdmin={isAdmin}
      appVersion={appVersion}
      adminLabel={adminLabel}
      versionLabel={versionLabel}
      inlineEditLabels={inlineEditLabels}
      homeInlineEditLabels={homeInlineEditLabels}
      initialDonateConfig={initialDonateConfig}
      donateEditLabels={donateEditLabels}
      diagramCopyLabel={diagramCopyLabel}
      diagramCopiedLabel={diagramCopiedLabel}
      languageSwitch={
        <WikiPublicLanguageSwitch
          lang={lang}
          langs={langs}
          groupAria={languageAria}
          pathSuffix={languagePathSuffix}
          queryString={languageQuery}
        />
      }
    >
      {children}
    </WikiPublicShellClient>
  );
}
