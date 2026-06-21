import { describe, expect, it } from "vitest";
import {
  buildSearchSnippet,
  buildSearchWhere,
  buildSearchWhereOr,
  normalizeSearchTerm,
  parseSearchTerms,
  rankSearchResults,
  splitSearchHighlight,
} from "@/lib/wiki-search";

describe("normalizeSearchTerm", () => {
  it("shouldTrimAndLowercaseWhenPunctuationPresent", () => {
    expect(normalizeSearchTerm(" Docker, ")).toBe("docker");
    expect(normalizeSearchTerm('"test"')).toBe("test");
  });
});

describe("parseSearchTerms", () => {
  it("shouldNormalizeAndLimitTerms", () => {
    expect(parseSearchTerms("  Foo,  bar  baz  ")).toEqual(["foo", "bar", "baz"]);
    const many = parseSearchTerms("a b c d e f g h");
    expect(many).toHaveLength(6);
  });
});

describe("buildSearchWhere", () => {
  it("shouldReturnEmptyWhenNoTerms", () => {
    expect(buildSearchWhere([])).toEqual({});
  });

  it("shouldAndTermsWithSearchTextAndFallback", () => {
    const where = buildSearchWhere(["docker"]);
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { title: { contains: "docker", mode: "insensitive" } },
            { searchText: { contains: "docker", mode: "insensitive" } },
            { excerpt: { contains: "docker", mode: "insensitive" } },
            { slug: { contains: "docker", mode: "insensitive" } },
            {
              AND: [
                { searchText: "" },
                { contentMd: { contains: "docker", mode: "insensitive" } },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("buildSearchWhereOr", () => {
  it("shouldOrTermsAcrossFields", () => {
    const where = buildSearchWhereOr(["a", "b"]);
    expect(where.OR).toHaveLength(2);
  });
});

describe("rankSearchResults", () => {
  const base = {
    id: "1",
    path: "/en/foo",
    excerpt: null as string | null,
    updatedAt: new Date("2026-01-01"),
    searchText: "",
  };

  it("shouldPreferTitleMatches", () => {
    const ranked = rankSearchResults(
      [
        { ...base, id: "low", title: "Other topic", searchText: "S: docker guide text here." },
        { ...base, id: "high", title: "Docker guide", searchText: "Docker guide" },
      ],
      ["docker"],
    );
    expect(ranked[0]?.id).toBe("high");
  });

  it("shouldBoostWhenAllTermsInHeadingLine", () => {
    const ranked = rankSearchResults(
      [
        {
          ...base,
          id: "low",
          title: "Misc",
          searchText: "Misc\nH: Docker\nS: compose is mentioned elsewhere in body.",
        },
        {
          ...base,
          id: "high",
          title: "Misc",
          searchText: "Misc\nH: Docker compose\nS: unrelated sentence here.",
        },
      ],
      ["docker", "compose"],
    );
    expect(ranked[0]?.id).toBe("high");
  });
});

describe("buildSearchSnippet", () => {
  it("shouldCenterSnippetAroundFirstMatch", () => {
    const text = "aaaa docker bbbb cccc dddd eeee ffff gggg hhhh";
    const snippet = buildSearchSnippet(text, ["docker"], 20);
    expect(snippet.toLowerCase()).toContain("docker");
  });

  it("shouldReturnEmptyForBlankText", () => {
    expect(buildSearchSnippet(null, ["x"])).toBe("");
  });
});

describe("splitSearchHighlight", () => {
  it("shouldMarkMatchingSegments", () => {
    const parts = splitSearchHighlight("Docker compose guide", ["docker", "guide"]);
    expect(parts.some((p) => p.match && p.text.toLowerCase() === "docker")).toBe(true);
    expect(parts.some((p) => p.match && p.text.toLowerCase() === "guide")).toBe(true);
  });
});
