"use client";

import type { ReactNode } from "react";
import { WikiInlineEditProvider } from "@/components/wiki-inline-edit-context";
import type { WikiInlineEditLabels } from "@/components/wiki-inline-edit-types";
import { WikiPublicHeader, type WikiPublicHeaderVariant } from "@/components/wiki-public-header";

type LangOption = { code: string; label: string };

export function WikiPublicShellClient({
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
  children: ReactNode;
}) {
  return (
    <WikiInlineEditProvider isAdmin={!!isAdmin} labels={inlineEditLabels}>
      <WikiPublicHeader
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
        editLabel={inlineEditLabels.mascotEdit}
        exitEditLabel={inlineEditLabels.mascotExitEdit}
      />
      <div className="wiki-public-content">{children}</div>
    </WikiInlineEditProvider>
  );
}
