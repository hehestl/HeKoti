import { describe, expect, it } from "vitest";
import { isValidWikiTreeGuideColor } from "@/lib/wiki-tree-theme";

describe("wikiTreeGuideColor validation", () => {
  it("shouldAcceptValidHex", () => {
    expect(isValidWikiTreeGuideColor("#ff0011")).toBe(true);
    expect(isValidWikiTreeGuideColor("#FF0011AA")).toBe(true);
  });

  it("shouldRejectInvalidHex", () => {
    expect(isValidWikiTreeGuideColor("ff0011")).toBe(false);
    expect(isValidWikiTreeGuideColor("#xyz")).toBe(false);
  });
});
