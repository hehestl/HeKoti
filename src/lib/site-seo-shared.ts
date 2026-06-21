export type RobotsTxtRule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};

export const DEFAULT_SITE_TITLE = "Hekoti";
export const DEFAULT_SITE_DESCRIPTION = "Hekoti — self-hosted wiki knowledge archive";

export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Bytespider",
  "CCBot",
  "anthropic-ai",
  "Applebot-Extended",
] as const;

const PRIVATE_DISALLOW = ["/admin", "/login", "/api"] as const;

export function resolveSiteTitle(envTitle: string, dbTitle: string): string {
  const fromEnv = envTitle.trim();
  if (fromEnv) return fromEnv;
  const fromDb = dbTitle.trim();
  if (fromDb) return fromDb;
  return DEFAULT_SITE_TITLE;
}

export function resolveSiteDescription(envDescription: string, dbDescription: string): string {
  const fromEnv = envDescription.trim();
  if (fromEnv) return fromEnv;
  const fromDb = dbDescription.trim();
  if (fromDb) return fromDb;
  return DEFAULT_SITE_DESCRIPTION;
}

export function isEnvFlagSet(raw: string | undefined): boolean {
  return raw === "0" || raw === "1";
}

export function resolveIndexSite(envRaw: "0" | "1" | undefined, dbValue: boolean): boolean {
  if (envRaw === "0") return false;
  if (envRaw === "1") return true;
  return dbValue;
}

export function resolveAiCrawlersAllow(envRaw: "0" | "1" | undefined, dbValue: boolean): boolean {
  if (envRaw === "0") return false;
  if (envRaw === "1") return true;
  return dbValue;
}

export function resolveLlmsTxtExtra(envExtra: string, dbExtra: string): string {
  const fromEnv = envExtra.trim();
  if (fromEnv) return fromEnv;
  return dbExtra.trim();
}

export function buildLlmsTxt(input: {
  title: string;
  description: string;
  appUrl: string;
  extra: string;
  indexSite: boolean;
}): string {
  const lines: string[] = [];
  if (!input.indexSite) {
    lines.push("# No public indexing", "", "This site is configured with indexing disabled.");
    return lines.join("\n");
  }
  lines.push(
    `# ${input.title}`,
    `> ${input.description}`,
    "",
    "## Docs",
    `${input.appUrl}/`,
    "",
    "## Sitemap",
    `${input.appUrl}/sitemap.xml`,
  );
  const extra = input.extra.trim();
  if (extra) {
    lines.push("", extra);
  }
  return lines.join("\n");
}

export function buildRobotsTxtRules(input: {
  indexSite: boolean;
  aiCrawlersAllow: boolean;
}): RobotsTxtRule[] {
  const rules: RobotsTxtRule[] = [
    {
      userAgent: "*",
      allow: input.indexSite ? ["/"] : undefined,
      disallow: input.indexSite ? [...PRIVATE_DISALLOW] : ["/", ...PRIVATE_DISALLOW],
    },
  ];

  if (!input.aiCrawlersAllow) {
    for (const userAgent of AI_CRAWLER_USER_AGENTS) {
      rules.push({ userAgent, disallow: ["/"] });
    }
  }

  return rules;
}

export function buildMetaRobots(indexSite: boolean): { index: boolean; follow: boolean } {
  return { index: indexSite, follow: indexSite };
}
