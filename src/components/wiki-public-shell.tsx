import { WikiPublicShellClient } from "@/components/wiki-public-shell-client";
import type { WikiInlineEditLabels } from "@/components/wiki-inline-edit-types";
import type { WikiPublicHeaderVariant } from "@/components/wiki-public-header";

type LangOption = { code: string; label: string };

export function WikiPublicShell({
  lang,
  langs,
  searchPlaceholder,
  languageAria,
  variant,
  initialSearchQuery,
  isAdmin,
  appVersion,
  adminLabel,
  versionLabel,
  inlineEditLabels,
  children,
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
  inlineEditLabels: WikiInlineEditLabels;
  children: React.ReactNode;
}) {
  return (
    <WikiPublicShellClient
      lang={lang}
      langs={langs}
      searchPlaceholder={searchPlaceholder}
      languageAria={languageAria}
      variant={variant}
      initialSearchQuery={initialSearchQuery}
      isAdmin={isAdmin}
      appVersion={appVersion}
      adminLabel={adminLabel}
      versionLabel={versionLabel}
      inlineEditLabels={inlineEditLabels}
    >
      {children}
    </WikiPublicShellClient>
  );
}
