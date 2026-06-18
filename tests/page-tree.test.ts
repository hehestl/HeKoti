import { describe, expect, it } from "vitest";
import { buildPathTree, pathKeysWithChildren } from "@/lib/page-tree";

describe("buildPathTree", () => {
  it("shouldSortCategoriesFirstWhenBuildingPathTree", () => {
    const pages = [
      {
        id: "1",
        path: "/en/article",
        title: "Article",
        navOrder: 0,
        isCategory: false,
      },
      {
        id: "2",
        path: "/en/docs",
        title: "Docs",
        navOrder: 0,
        isCategory: true,
      },
    ];

    const tree = buildPathTree(pages, "en");
    expect(tree[0]?.page?.isCategory).toBe(true);
    expect(tree[1]?.page?.isCategory).toBe(false);
  });

  it("shouldIncludeCategoryWithoutChildrenInExpandableKeys", () => {
    const pages = [
      {
        id: "1",
        path: "/en/docs",
        title: "Docs",
        navOrder: 0,
        isCategory: true,
      },
    ];
    const tree = buildPathTree(pages, "en");
    const keys = pathKeysWithChildren(tree);
    expect(keys.has("/en/docs")).toBe(true);
  });
});
