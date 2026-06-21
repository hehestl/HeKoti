import { describe, expect, it } from "vitest";
import {
  buildLlmsTxt,
  buildMetaRobots,
  buildRobotsTxtRules,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  resolveAiCrawlersAllow,
  resolveIndexSite,
  resolveLlmsTxtExtra,
  resolveSiteDescription,
  resolveSiteTitle,
} from "@/lib/site-seo-shared";

describe("resolveSiteTitle", () => {
  it("prefers env over db and default", () => {
    expect(resolveSiteTitle("Env Wiki", "Db Wiki")).toBe("Env Wiki");
    expect(resolveSiteTitle("", "Db Wiki")).toBe("Db Wiki");
    expect(resolveSiteTitle("", "")).toBe(DEFAULT_SITE_TITLE);
  });
});

describe("resolveSiteDescription", () => {
  it("prefers env over db and default", () => {
    expect(resolveSiteDescription("From env", "From db")).toBe("From env");
    expect(resolveSiteDescription("", "From db")).toBe("From db");
    expect(resolveSiteDescription("", "")).toBe(DEFAULT_SITE_DESCRIPTION);
  });
});

describe("resolveIndexSite", () => {
  it("env 0/1 overrides db", () => {
    expect(resolveIndexSite("0", true)).toBe(false);
    expect(resolveIndexSite("1", false)).toBe(true);
    expect(resolveIndexSite(undefined, false)).toBe(false);
  });
});

describe("resolveAiCrawlersAllow", () => {
  it("env 0/1 overrides db", () => {
    expect(resolveAiCrawlersAllow("0", true)).toBe(false);
    expect(resolveAiCrawlersAllow("1", false)).toBe(true);
    expect(resolveAiCrawlersAllow(undefined, true)).toBe(true);
  });
});

describe("resolveLlmsTxtExtra", () => {
  it("prefers env over db", () => {
    expect(resolveLlmsTxtExtra("env block", "db block")).toBe("env block");
    expect(resolveLlmsTxtExtra("", "db block")).toBe("db block");
  });
});

describe("buildLlmsTxt", () => {
  it("builds standard llms.txt when indexing enabled", () => {
    const body = buildLlmsTxt({
      title: "My Wiki",
      description: "Knowledge base",
      appUrl: "https://wiki.example.com",
      extra: "## Contact\nsupport@example.com",
      indexSite: true,
    });
    expect(body).toContain("# My Wiki");
    expect(body).toContain("> Knowledge base");
    expect(body).toContain("https://wiki.example.com/sitemap.xml");
    expect(body).toContain("support@example.com");
  });

  it("returns no-index notice when indexing disabled", () => {
    const body = buildLlmsTxt({
      title: "My Wiki",
      description: "Knowledge base",
      appUrl: "https://wiki.example.com",
      extra: "",
      indexSite: false,
    });
    expect(body).toContain("No public indexing");
  });
});

describe("buildRobotsTxtRules", () => {
  it("allows indexing with private paths blocked", () => {
    const rules = buildRobotsTxtRules({ indexSite: true, aiCrawlersAllow: true });
    expect(rules[0]?.userAgent).toBe("*");
    expect(rules[0]?.allow).toEqual(["/"]);
    expect(rules[0]?.disallow).toEqual(["/admin", "/login", "/api"]);
    expect(rules).toHaveLength(1);
  });

  it("disallows all when site not indexed", () => {
    const rules = buildRobotsTxtRules({ indexSite: false, aiCrawlersAllow: true });
    expect(rules[0]?.disallow).toContain("/");
  });

  it("adds AI bot rules when blocked", () => {
    const rules = buildRobotsTxtRules({ indexSite: true, aiCrawlersAllow: false });
    expect(rules.length).toBeGreaterThan(1);
    expect(rules.some((r) => r.userAgent === "GPTBot")).toBe(true);
  });
});

describe("buildMetaRobots", () => {
  it("mirrors indexSite flag", () => {
    expect(buildMetaRobots(true)).toEqual({ index: true, follow: true });
    expect(buildMetaRobots(false)).toEqual({ index: false, follow: false });
  });
});
