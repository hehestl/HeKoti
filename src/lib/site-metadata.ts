import "server-only";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  isEnvFlagSet,
  resolveAiCrawlersAllow,
  resolveIndexSite,
  resolveLlmsTxtExtra,
  resolveSiteDescription,
  resolveSiteTitle,
} from "@/lib/site-seo-shared";

type SeoDbRow = {
  siteTitle: string;
  siteDescription: string;
  robotsIndexSite: boolean;
  aiCrawlersAllow: boolean;
  llmsTxtExtra: string;
};

const SEO_DB_DEFAULTS: SeoDbRow = {
  siteTitle: "",
  siteDescription: "",
  robotsIndexSite: true,
  aiCrawlersAllow: true,
  llmsTxtExtra: "",
};

async function loadSeoDbRow(): Promise<SeoDbRow> {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) return SEO_DB_DEFAULTS;
    return {
      siteTitle: settings.siteTitle ?? "",
      siteDescription: settings.siteDescription ?? "",
      robotsIndexSite: settings.robotsIndexSite ?? true,
      aiCrawlersAllow: settings.aiCrawlersAllow ?? true,
      llmsTxtExtra: settings.llmsTxtExtra ?? "",
    };
  } catch {
    return SEO_DB_DEFAULTS;
  }
}

export function isSiteTitleEnvLocked(): boolean {
  return Boolean(process.env.SITE_TITLE?.trim());
}

export function isSiteDescriptionEnvLocked(): boolean {
  return Boolean(process.env.SITE_DESCRIPTION?.trim());
}

export async function getSiteMetadata(): Promise<{ title: string; description: string }> {
  const db = await loadSeoDbRow();
  return {
    title: resolveSiteTitle(env.SITE_TITLE, db.siteTitle),
    description: resolveSiteDescription(env.SITE_DESCRIPTION, db.siteDescription),
  };
}

export type SiteMetadataForAdmin = {
  title: string;
  description: string;
  dbTitle: string;
  dbDescription: string;
  dbRobotsIndexSite: boolean;
  dbAiCrawlersAllow: boolean;
  dbLlmsTxtExtra: string;
  titleFromEnv: boolean;
  descriptionFromEnv: boolean;
  robotsIndexSite: boolean;
  aiCrawlersAllow: boolean;
  llmsTxtExtra: string;
  robotsIndexFromEnv: boolean;
  aiCrawlersFromEnv: boolean;
  llmsTxtExtraFromEnv: boolean;
};

export async function getSiteMetadataForAdmin(): Promise<SiteMetadataForAdmin> {
  const db = await loadSeoDbRow();

  return {
    title: resolveSiteTitle(env.SITE_TITLE, db.siteTitle),
    description: resolveSiteDescription(env.SITE_DESCRIPTION, db.siteDescription),
    dbTitle: db.siteTitle,
    dbDescription: db.siteDescription,
    dbRobotsIndexSite: db.robotsIndexSite,
    dbAiCrawlersAllow: db.aiCrawlersAllow,
    dbLlmsTxtExtra: db.llmsTxtExtra,
    titleFromEnv: isSiteTitleEnvLocked(),
    descriptionFromEnv: isSiteDescriptionEnvLocked(),
    robotsIndexSite: resolveIndexSite(env.SITE_ROBOTS_INDEX, db.robotsIndexSite),
    aiCrawlersAllow: resolveAiCrawlersAllow(env.AI_CRAWLERS_ALLOW, db.aiCrawlersAllow),
    llmsTxtExtra: resolveLlmsTxtExtra(env.LLMS_TXT_EXTRA, db.llmsTxtExtra),
    robotsIndexFromEnv: isEnvFlagSet(process.env.SITE_ROBOTS_INDEX),
    aiCrawlersFromEnv: isEnvFlagSet(process.env.AI_CRAWLERS_ALLOW),
    llmsTxtExtraFromEnv: Boolean(process.env.LLMS_TXT_EXTRA?.trim()),
  };
}

export { DEFAULT_SITE_TITLE, DEFAULT_SITE_DESCRIPTION };
