import { describe, expect, it } from "vitest";
import {
  applyPageSearchText,
  buildPageSearchText,
  extractPlainSentences,
  parseSearchTextLines,
  pickBestSearchLine,
  stripMarkdownToPlain,
} from "@/lib/page-search-index";

describe("buildPageSearchText", () => {
  it("shouldIncludeTitleHeadingsAndSentences", () => {
    const md = `# Top
## Installation
Run docker compose up to start the stack.
\`\`\`js
const x = 1;
\`\`\`
More text here for testing.`;
    const text = buildPageSearchText("Docker Guide", md);
    expect(text).toContain("Docker Guide");
    expect(text).toContain("H: Installation");
    expect(text).toContain("S: Run docker compose up to start the stack");
    expect(text).not.toContain("const x");
  });
});

describe("stripMarkdownToPlain", () => {
  it("shouldSkipHeadingsAndCodeBlocks", () => {
    const plain = stripMarkdownToPlain("## Skip me\nHello [link](/x).\n```\ncode\n```");
    expect(plain).not.toContain("Skip me");
    expect(plain).toContain("Hello link");
    expect(plain).not.toContain("code");
  });
});

describe("extractPlainSentences", () => {
  it("shouldFilterShortChunks", () => {
    const sentences = extractPlainSentences("Hi. This is a long enough sentence here.");
    expect(sentences.some((s) => s.includes("long enough"))).toBe(true);
    expect(sentences.some((s) => s === "Hi")).toBe(false);
  });
});

describe("parseSearchTextLines", () => {
  it("shouldParsePrefixes", () => {
    const lines = parseSearchTextLines("Title\nH: Head\nS: Sentence one.");
    expect(lines).toEqual([
      { kind: "title", text: "Title" },
      { kind: "heading", text: "Head" },
      { kind: "sentence", text: "Sentence one." },
    ]);
  });
});

describe("pickBestSearchLine", () => {
  it("shouldPreferHeadingWhenAllTermsMatch", () => {
    const text = buildPageSearchText("Other", "## Docker Install\nSome unrelated body text here.");
    const match = pickBestSearchLine(text, ["docker", "install"]);
    expect(match?.kind).toBe("heading");
    expect(match?.text.toLowerCase()).toContain("docker");
  });
});

describe("applyPageSearchText", () => {
  it("shouldReturnEmptyForNotesScope", () => {
    expect(applyPageSearchText({ title: "T", contentMd: "body", scope: "NOTES" })).toEqual({ searchText: "" });
  });
});
