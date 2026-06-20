import { describe, expect, it } from "vitest";
import {
  extractWikiHeadings,
  injectHeadingIds,
  shouldShowWikiToc,
  slugifyHeadingId,
} from "@/lib/wiki-headings";

describe("wiki-headings", () => {
  it("parses h1-h4 headings", () => {
    const md = `# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n`;
    const headings = extractWikiHeadings(md);
    expect(headings).toHaveLength(4);
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3, 4]);
    expect(headings[0].text).toBe("One");
  });

  it("deduplicates slug ids", () => {
    const used = new Set<string>();
    expect(slugifyHeadingId("Intro", used)).toBe("intro");
    expect(slugifyHeadingId("Intro", used)).toBe("intro-2");
  });

  it("returns empty for article without headings", () => {
    expect(extractWikiHeadings("Plain text only.")).toEqual([]);
    expect(shouldShowWikiToc(true, [])).toBe(false);
  });

  it("hides toc when showToc is false", () => {
    const headings = extractWikiHeadings("## Section");
    expect(shouldShowWikiToc(false, headings)).toBe(false);
    expect(shouldShowWikiToc(true, headings)).toBe(true);
  });

  it("injects heading ids into html", () => {
    const headings = extractWikiHeadings("## Hello");
    const html = injectHeadingIds("<h2>Hello</h2><p>x</p>", headings);
    expect(html).toContain('id="hello"');
  });
});
