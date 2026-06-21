import "server-only";

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSiteMetadata } from "@/lib/site-metadata";
import {
  buildLlmsTxt,
  buildMetaRobots,
  buildRobotsTxtRules,
  resolveAiCrawlersAllow,
  resolveIndexSite,
  resolveLlmsTxtExtra,
  type RobotsTxtRule,
} from "@/lib/site-seo-shared";

async function loadCrawlerDbRow(): Promise<{
  robotsIndexSite: boolean;
  aiCrawlersAllow: boolean;
  llmsTxtExtra: string;
}> {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      return { robotsIndexSite: true, aiCrawlersAllow: true, llmsTxtExtra: "" };
    }
    return {
      robotsIndexSite: settings.robotsIndexSite ?? true,
      aiCrawlersAllow: settings.aiCrawlersAllow ?? true,
      llmsTxtExtra: settings.llmsTxtExtra ?? "",
    };
  } catch {
    return { robotsIndexSite: true, aiCrawlersAllow: true, llmsTxtExtra: "" };
  }
}

export async function getCrawlerPolicy(): Promise<{
  indexSite: boolean;
  aiCrawlersAllow: boolean;
  llmsTxtExtra: string;
  metaRobots: NonNullable<Metadata["robots"]>;
  robotsTxtRules: RobotsTxtRule[];
}> {
  const db = await loadCrawlerDbRow();
  const indexSite = resolveIndexSite(env.SITE_ROBOTS_INDEX, db.robotsIndexSite);
  const aiCrawlersAllow = resolveAiCrawlersAllow(env.AI_CRAWLERS_ALLOW, db.aiCrawlersAllow);
  const llmsTxtExtra = resolveLlmsTxtExtra(env.LLMS_TXT_EXTRA, db.llmsTxtExtra);

  return {
    indexSite,
    aiCrawlersAllow,
    llmsTxtExtra,
    metaRobots: buildMetaRobots(indexSite),
    robotsTxtRules: buildRobotsTxtRules({ indexSite, aiCrawlersAllow }),
  };
}

export async function getLlmsTxtBody(): Promise<string> {
  const [{ title, description }, policy] = await Promise.all([getSiteMetadata(), getCrawlerPolicy()]);
  return buildLlmsTxt({
    title,
    description,
    appUrl: env.APP_URL.replace(/\/$/, ""),
    extra: policy.llmsTxtExtra,
    indexSite: policy.indexSite,
  });
}
