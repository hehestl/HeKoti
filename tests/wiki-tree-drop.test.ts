import { describe, expect, it } from "vitest";
import { resolveDropPosition } from "@/lib/wiki-tree-drop";

describe("resolveDropPosition", () => {
  it("shouldReturnBeforeOrAfterOnlyForTerminalPage", () => {
    const target = { isCategory: false, hasChildren: false, isFolderOnly: false };
    expect(resolveDropPosition(10, 40, target)).toBe("before");
    expect(resolveDropPosition(30, 40, target)).toBe("after");
  });

  it("shouldReturnInsideForCategoryMiddleZone", () => {
    const target = { isCategory: true, hasChildren: false, isFolderOnly: false };
    expect(resolveDropPosition(20, 40, target)).toBe("inside");
  });
});
