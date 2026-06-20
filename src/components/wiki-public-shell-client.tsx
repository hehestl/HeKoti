"use client";

import type { ReactNode } from "react";
import { DonateInlineEditProvider } from "@/components/donate-inline-edit-context";
import type { DonateInlineEditLabels } from "@/components/donate-inline-edit-types";
import { HomeInlineEditProvider } from "@/components/home-inline-edit-context";
import type { HomeInlineEditLabels } from "@/components/home-inline-edit-types";
import { WikiInlineEditProvider } from "@/components/wiki-inline-edit-context";
import type { WikiInlineEditLabels } from "@/components/wiki-inline-edit-types";
import { WikiDiagramEnhancer } from "@/components/wiki-diagram-enhancer";
import { WikiPublicHeader, type WikiPublicHeaderVariant } from "@/components/wiki-public-header";
import type { DonateConfig } from "@/lib/donate-config";

type LangOption = { code: string; label: string };

export function WikiPublicShellClient({
  lang,
  langs,
  searchPlaceholder,
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
  children,
}: {
  lang: string;
  langs: LangOption[];
  searchPlaceholder: string;
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
  children: ReactNode;
}) {
  const editLabel = donateEditLabels?.edit ?? inlineEditLabels.mascotEdit;
  const exitEditLabel = donateEditLabels?.exitEdit ?? inlineEditLabels.mascotExitEdit;

  const shell = (
    <>
      <WikiDiagramEnhancer copyLabel={diagramCopyLabel} copiedLabel={diagramCopiedLabel} />
      <WikiPublicHeader
        lang={lang}
        langs={langs}
        searchPlaceholder={searchPlaceholder}
        languageAria={languageAria}
        variant={variant}
        initialSearchQuery={initialSearchQuery}
        searchSampleTitles={searchSampleTitles}
        enableTypewriterPlaceholder={enableTypewriterPlaceholder}
        isAdmin={isAdmin}
        appVersion={appVersion}
        adminLabel={adminLabel}
        versionLabel={versionLabel}
        editLabel={editLabel}
        exitEditLabel={exitEditLabel}
      />
      <div className="wiki-public-content">{children}</div>
    </>
  );

  const withWiki = (
    <WikiInlineEditProvider isAdmin={!!isAdmin} labels={inlineEditLabels}>
      <HomeInlineEditProvider isAdmin={!!isAdmin} labels={homeInlineEditLabels ?? defaultHomeInlineEditLabels(inlineEditLabels)}>
        {initialDonateConfig && donateEditLabels ? (
          <DonateInlineEditProvider isAdmin={!!isAdmin} labels={donateEditLabels}>
            {shell}
          </DonateInlineEditProvider>
        ) : (
          shell
        )}
      </HomeInlineEditProvider>
    </WikiInlineEditProvider>
  );

  return withWiki;
}

function defaultHomeInlineEditLabels(wiki: WikiInlineEditLabels): HomeInlineEditLabels {
  return {
    dragHint: "",
    makeCategory: "",
    implicitHint: "",
    leafReadOnly: "",
    systemReadOnly: "",
    clearIcon: "",
    save: wiki.save,
    cancel: wiki.cancel,
    saved: wiki.saved,
    saving: wiki.saving,
    failed: wiki.failed,
    dirtyConfirm: wiki.dirtyConfirm,
    mascotEdit: wiki.mascotEdit,
    mascotExitEdit: wiki.mascotExitEdit,
  };
}
