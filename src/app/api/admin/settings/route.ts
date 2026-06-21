import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";
import { getEnabledLanguages } from "@/lib/site-config";
import {
  isSiteDescriptionEnvLocked,
  isSiteTitleEnvLocked,
} from "@/lib/site-metadata";
import { isEnvFlagSet } from "@/lib/site-seo-shared";
import { lintTelemetrySnippet } from "@/lib/telemetry-snippets";
import { isValidWikiTreeGuideColor } from "@/lib/wiki-tree-theme";

const settingsSchema = z.object({
  defaultLanguage: z.string().min(2).max(12),
  headHtml: z.string().max(100000).optional(),
  bodyHtml: z.string().max(100000).optional(),
  wikiTreeGuideColor: z.string().max(9).nullable().optional(),
  siteTitle: z.string().max(120).optional(),
  siteDescription: z.string().max(500).optional(),
  robotsIndexSite: z.boolean().optional(),
  aiCrawlersAllow: z.boolean().optional(),
  llmsTxtExtra: z.string().max(10000).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();
    const parsed = settingsSchema.parse(body);
    const {
      defaultLanguage,
      headHtml,
      bodyHtml,
      wikiTreeGuideColor,
      siteTitle,
      siteDescription,
      robotsIndexSite,
      aiCrawlersAllow,
      llmsTxtExtra,
    } = parsed;

    const enabled = await getEnabledLanguages();
    if (!enabled.includes(defaultLanguage)) {
      return NextResponse.json({ ok: false, message: "Invalid language" }, { status: 400 });
    }

    if (headHtml !== undefined) {
      const issues = lintTelemetrySnippet(headHtml);
      if (issues.length > 0) {
        return NextResponse.json({ ok: false, message: `headHtml rejected: ${issues[0]}` }, { status: 400 });
      }
    }
    if (bodyHtml !== undefined) {
      const issues = lintTelemetrySnippet(bodyHtml);
      if (issues.length > 0) {
        return NextResponse.json({ ok: false, message: `bodyHtml rejected: ${issues[0]}` }, { status: 400 });
      }
    }

    if (wikiTreeGuideColor !== undefined && wikiTreeGuideColor !== null && !isValidWikiTreeGuideColor(wikiTreeGuideColor)) {
      return NextResponse.json({ ok: false, message: "Invalid wikiTreeGuideColor hex." }, { status: 400 });
    }

    const envLocked: string[] = [];
    const seoUpdate: {
      siteTitle?: string;
      siteDescription?: string;
      robotsIndexSite?: boolean;
      aiCrawlersAllow?: boolean;
      llmsTxtExtra?: string;
    } = {};

    if (siteTitle !== undefined) {
      if (isSiteTitleEnvLocked()) envLocked.push("siteTitle");
      else seoUpdate.siteTitle = siteTitle;
    }
    if (siteDescription !== undefined) {
      if (isSiteDescriptionEnvLocked()) envLocked.push("siteDescription");
      else seoUpdate.siteDescription = siteDescription;
    }
    if (robotsIndexSite !== undefined) {
      if (isEnvFlagSet(process.env.SITE_ROBOTS_INDEX)) envLocked.push("robotsIndexSite");
      else seoUpdate.robotsIndexSite = robotsIndexSite;
    }
    if (aiCrawlersAllow !== undefined) {
      if (isEnvFlagSet(process.env.AI_CRAWLERS_ALLOW)) envLocked.push("aiCrawlersAllow");
      else seoUpdate.aiCrawlersAllow = aiCrawlersAllow;
    }
    if (llmsTxtExtra !== undefined) {
      if (process.env.LLMS_TXT_EXTRA?.trim()) envLocked.push("llmsTxtExtra");
      else seoUpdate.llmsTxtExtra = llmsTxtExtra;
    }

    await prisma.globalSettings.upsert({
      where: { id: "default" },
      update: {
        defaultLanguage,
        ...(headHtml !== undefined ? { headHtml } : {}),
        ...(bodyHtml !== undefined ? { bodyHtml } : {}),
        ...(wikiTreeGuideColor !== undefined ? { wikiTreeGuideColor } : {}),
        ...seoUpdate,
      },
      create: {
        id: "default",
        defaultLanguage,
        headHtml: headHtml ?? "",
        bodyHtml: bodyHtml ?? "",
        wikiTreeGuideColor: wikiTreeGuideColor ?? null,
        siteTitle: seoUpdate.siteTitle ?? "",
        siteDescription: seoUpdate.siteDescription ?? "",
        robotsIndexSite: seoUpdate.robotsIndexSite ?? true,
        aiCrawlersAllow: seoUpdate.aiCrawlersAllow ?? true,
        llmsTxtExtra: seoUpdate.llmsTxtExtra ?? "",
      },
    });

    return NextResponse.json({ ok: true, envLocked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settings update failed";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
