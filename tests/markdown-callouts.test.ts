import { describe, expect, it } from "vitest";
import { expandCalloutBlocks } from "@/lib/markdown-callouts";
import { renderMarkdown } from "@/lib/markdown";

describe("expandCalloutBlocks", () => {
  it("converts GitHub-style callout to aside", () => {
    const md = "> [!WARNING]\n> Be careful.\n";
    const out = expandCalloutBlocks(md);
    expect(out).toContain('class="wiki-callout wiki-callout--warning"');
    expect(out).toContain("Be careful.");
  });
});

describe("renderMarkdown callouts", () => {
  it("preserves callout aside in sanitized html", () => {
    const html = renderMarkdown("> [!NOTE]\n> Hello\n");
    expect(html).toContain("wiki-callout");
    expect(html).toContain("Hello");
  });
});

describe("renderMarkdown block styles", () => {
  it("renders blockquote and table", () => {
    const html = renderMarkdown("> quote\n\n| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
  });
});
