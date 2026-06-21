import { describe, expect, it } from "vitest";
import type { PathTreeNode } from "@/lib/page-tree";
import type { WikiTreePage } from "@/lib/wiki-collection";
import {
  applyReorderPatchesToDraft,
  buildHomePatchPayloads,
  buildTreeFromCategoryDraft,
  categoryMapsEqual,
  cloneCategoryMap,
  getSiblingMoveTarget,
  treeToCategoryMaps,
} from "@/components/home-inline-edit-types";

const lang = "en";

function node(
  pathKey: string,
  segment: string,
  page: WikiTreePage | null,
  children: PathTreeNode<WikiTreePage>[] = [],
): PathTreeNode<WikiTreePage> {
  return { pathKey, segment, page, children };
}

describe("treeToCategoryMaps", () => {
  it("maps tree nodes with computed flags", () => {
    const tree = [
      node("/en/wallet", "wallet", {
        id: "w1",
        path: "/en/wallet",
        title: "Wallet",
        navOrder: 0,
        isCategory: true,
        icon: "wallet",
        systemKey: null,
      }),
    ];
    const map = treeToCategoryMaps(tree, lang);
    const cat = map.get("/en/wallet");
    expect(cat?.canEdit).toBe(true);
    expect(cat?.parentPathKey).toBe("/en");
  });

  it("marks system pages as not editable", () => {
    const tree = [
      node("/en/about", "about", {
        id: "s1",
        path: "/en/about",
        title: "About",
        navOrder: 0,
        isCategory: true,
        systemKey: "about",
      }),
    ];
    const map = treeToCategoryMaps(tree, lang);
    expect(map.get("/en/about")?.canEdit).toBe(false);
    expect(map.get("/en/about")?.isSystem).toBe(true);
  });
});

describe("categoryMapsEqual / isDirty", () => {
  it("detects title changes", () => {
    const tree = [
      node("/en/a", "a", { id: "1", path: "/en/a", title: "A", navOrder: 0, isCategory: true }),
    ];
    const baseline = treeToCategoryMaps(tree, lang);
    const draft = cloneCategoryMap(baseline);
    draft.set("/en/a", { ...draft.get("/en/a")!, title: "B" });
    expect(categoryMapsEqual(baseline, draft)).toBe(false);
  });
});

describe("applyReorderPatchesToDraft", () => {
  it("updates navOrder and pathKey on reparent", () => {
    const tree = [
      node("/en/a", "a", { id: "a", path: "/en/a", title: "A", navOrder: 0, isCategory: true }, [
        node("/en/a/c", "c", { id: "c", path: "/en/a/c", title: "C", navOrder: 0, isCategory: true }),
      ]),
      node("/en/b", "b", { id: "b", path: "/en/b", title: "B", navOrder: 10, isCategory: true }),
    ];
    const draft = treeToCategoryMaps(tree, lang);
    const next = applyReorderPatchesToDraft(lang, draft, [
      { id: "c", navOrder: 0, parentPathParts: [] },
    ]);
    expect(next.has("/en/c")).toBe(true);
    expect(next.get("/en/c")?.parentPathKey).toBe("/en");
    expect(next.has("/en/a/c")).toBe(false);
  });
});

describe("buildHomePatchPayloads", () => {
  it("diffs excerpt changes", () => {
    const tree = [
      node("/en/a", "a", {
        id: "a",
        path: "/en/a",
        title: "A",
        navOrder: 0,
        isCategory: true,
        excerpt: "Old",
      }),
    ];
    const baseline = treeToCategoryMaps(tree, lang);
    const draft = cloneCategoryMap(baseline);
    draft.set("/en/a", { ...draft.get("/en/a")!, excerpt: "New summary" });
    const patches = buildHomePatchPayloads(baseline, draft, lang);
    expect(patches).toEqual([{ id: "a", payload: { excerpt: "New summary" } }]);
  });

  it("diffs by id after pathKey rename in draft", () => {
    const tree = [
      node("/en/a", "a", { id: "a", path: "/en/a", title: "A", navOrder: 0, isCategory: true }),
    ];
    const baseline = treeToCategoryMaps(tree, lang);
    const draft = cloneCategoryMap(baseline);
    const moved = { ...draft.get("/en/a")!, pathKey: "/en/b/a", parentPathKey: "/en/b", title: "A2" };
    draft.delete("/en/a");
    draft.set("/en/b/a", moved);

    const patches = buildHomePatchPayloads(baseline, draft, lang);
    expect(patches).toEqual([
      {
        id: "a",
        payload: { title: "A2", parentPathParts: ["b"] },
      },
    ]);
  });

  it("emits navOrder patches for sibling reorder", () => {
    const tree = [
      node("/en/a", "a", { id: "a", path: "/en/a", title: "A", navOrder: 0, isCategory: true }),
      node("/en/b", "b", { id: "b", path: "/en/b", title: "B", navOrder: 10, isCategory: true }),
    ];
    const baseline = treeToCategoryMaps(tree, lang);
    const draft = cloneCategoryMap(baseline);
    const next = applyReorderPatchesToDraft(lang, draft, [
      { id: "b", navOrder: 0, parentPathParts: [] },
      { id: "a", navOrder: 10, parentPathParts: [] },
    ]);
    const patches = buildHomePatchPayloads(baseline, next, lang);
    expect(patches).toHaveLength(2);
    expect(patches).toEqual(
      expect.arrayContaining([
        { id: "b", payload: { navOrder: 0 } },
        { id: "a", payload: { navOrder: 10 } },
      ]),
    );
    expect(categoryMapsEqual(next, cloneCategoryMap(next))).toBe(true);
  });
});

describe("getSiblingMoveTarget", () => {
  it("returns before target for move up", () => {
    const tree = [
      node("/en/a", "a", { id: "a", path: "/en/a", title: "A", navOrder: 0, isCategory: true }),
      node("/en/b", "b", { id: "b", path: "/en/b", title: "B", navOrder: 10, isCategory: true }),
    ];
    const draft = treeToCategoryMaps(tree, lang);
    expect(getSiblingMoveTarget(draft, "/en/b", "up")).toEqual({
      kind: "page",
      targetId: "a",
      mode: "before",
    });
  });
});

describe("buildTreeFromCategoryDraft", () => {
  it("rebuilds nested tree from draft map", () => {
    const tree = [
      node("/en/a", "a", { id: "a", path: "/en/a", title: "A", navOrder: 0, isCategory: true }, [
        node("/en/a/c", "c", { id: "c", path: "/en/a/c", title: "C", navOrder: 0, isCategory: true }),
      ]),
    ];
    const draft = treeToCategoryMaps(tree, lang);
    const rebuilt = buildTreeFromCategoryDraft(draft, lang);
    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0]?.children).toHaveLength(1);
  });
});
