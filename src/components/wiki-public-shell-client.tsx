"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { DonateInlineEditLabels } from "@/components/donate-inline-edit-types";
import { HomeInlineEditProvider } from "@/components/home-inline-edit-context";
import type { HomeInlineEditLabels } from "@/components/home-inline-edit-types";
import { WikiInlineEditProvider } from "@/components/wiki-inline-edit-context";
import type { WikiInlineEditLabels } from "@/components/wiki-inline-edit-types";
import { WikiDiagramEnhancer } from "@/components/wiki-diagram-enhancer";
import { WikiPublicHeader, type WikiPublicHeaderVariant } from "@/components/wiki-public-header";
import type { DonateConfig } from "@/lib/donate-config-shared";

const DonateInlineEditProvider = dynamic(
  () =>
    import("@/components/donate-inline-edit-context").then((mod) => ({
      default: mod.DonateInlineEditProvider,
    })),
  { ssr: true },
);

export function WikiPublicShellClient({
  lang,
  searchPlaceholder,
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
  languageSwitch,
  children,
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
  inlineEditLabels: WikiInlineEditLabels;
  homeInlineEditLabels?: HomeInlineEditLabels;
  initialDonateConfig?: DonateConfig;
  donateEditLabels?: DonateInlineEditLabels;
  diagramCopyLabel: string;
  diagramCopiedLabel: string;
  languageSwitch: ReactNode;
  children: ReactNode;
}) {
  const editLabel = donateEditLabels?.edit ?? inlineEditLabels.mascotEdit;
  const exitEditLabel = donateEditLabels?.exitEdit ?? inlineEditLabels.mascotExitEdit;

  const shell = (
    <>
      <WikiDiagramEnhancer copyLabel={diagramCopyLabel} copiedLabel={diagramCopiedLabel} />
      <WikiPublicHeader
        lang={lang}
        searchPlaceholder={searchPlaceholder}
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
        inlineEditSource={initialDonateConfig && donateEditLabels ? "donate" : "auto"}
        languageSwitch={languageSwitch}
      />
      <div className="wiki-public-content">{children}</div>
    </>
  );

  const withWiki = (
    <WikiInlineEditProvider isAdmin={!!isAdmin} labels={inlineEditLabels}>
      <HomeInlineEditProvider isAdmin={!!isAdmin} labels={homeInlineEditLabels ?? defaultHomeInlineEditLabels(inlineEditLabels)}>
        {initialDonateConfig && donateEditLabels ? (
          <DonateInlineEditProvider isAdmin={!!isAdmin} labels={donateEditLabels} initialConfig={initialDonateConfig}>
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
