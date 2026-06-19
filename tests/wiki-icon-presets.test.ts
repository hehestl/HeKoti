import { describe, expect, it } from "vitest";
import { Coins, Folder } from "lucide-react";
import { resolveWikiIconComponent, WIKI_ICON_PRESETS } from "@/lib/wiki-icon-presets";

describe("wiki-icon-presets", () => {
  it("uses custom icon for categories when set", () => {
    expect(resolveWikiIconComponent("coins", true)).toBe(WIKI_ICON_PRESETS.coins);
    expect(resolveWikiIconComponent("coins", true)).toBe(Coins);
  });

  it("falls back to folder for categories without icon", () => {
    expect(resolveWikiIconComponent(null, true)).toBe(Folder);
    expect(resolveWikiIconComponent("folder", true)).toBe(Folder);
  });
});
