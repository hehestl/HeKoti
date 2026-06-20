import { describe, expect, it } from "vitest";
import {
  collectSiblingSlugs,
  isMoveIntoDescendant,
  nextPagePath,
  planPageBranchMove,
  planPageSlugRename,
  remapDescendantPath,
} from "@/lib/page-move";

describe("page-move", () => {
  it("detects move into own descendant", () => {
    expect(isMoveIntoDescendant("/en/a", "/en/a/b")).toBe(true);
    expect(isMoveIntoDescendant("/en/a", "/en/a")).toBe(true);
    expect(isMoveIntoDescendant("/en/a", "/en/b")).toBe(false);
  });

  it("remaps descendant paths", () => {
    expect(remapDescendantPath("/en/a", "/en/x", "/en/a/c/d")).toBe("/en/x/c/d");
  });

  it("plans branch move with descendants", () => {
    const plan = planPageBranchMove(
      { id: "1", path: "/en/a" },
      ["x"],
      "en",
      "a",
      [
        { id: "2", path: "/en/a/b" },
        { id: "3", path: "/en/a/b/c" },
      ],
    );
    expect(plan.newPath).toBe("/en/x/a");
    expect(plan.updates).toEqual([
      { id: "1", path: "/en/x/a" },
      { id: "2", path: "/en/x/a/b" },
      { id: "3", path: "/en/x/a/b/c" },
    ]);
  });

  it("rejects move into descendant", () => {
    expect(() =>
      planPageBranchMove({ id: "1", path: "/en/a" }, ["a", "b"], "en", "a", []),
    ).toThrow("MOVE_INTO_DESCENDANT");
  });

  it("nextPagePath builds normalized path", () => {
    expect(nextPagePath("en", ["foo"], "bar")).toBe("/en/foo/bar");
    expect(nextPagePath("en", [], "bar")).toBe("/en/bar");
  });

  it("planPageSlugRename cascades paths for nested pages", () => {
    const plan = planPageSlugRename(
      { id: "2", path: "/en/parent/child1", slug: "child1", lang: "en" },
      "new-child",
      [{ id: "3", path: "/en/parent/child1/subchild" }],
      ["other"],
    );
    expect(plan.pathUpdates).toEqual([
      { id: "2", path: "/en/parent/new-child", slug: "new-child" },
      { id: "3", path: "/en/parent/new-child/subchild" },
    ]);
    expect(plan.redirectPairs).toEqual([
      { lang: "en", oldPath: "/en/parent/child1", newPath: "/en/parent/new-child" },
      { lang: "en", oldPath: "/en/parent/child1/subchild", newPath: "/en/parent/new-child/subchild" },
    ]);
  });

  it("planPageSlugRename returns empty when slug unchanged", () => {
    const plan = planPageSlugRename(
      { id: "1", path: "/en/foo", slug: "foo", lang: "en" },
      "foo",
      [],
      [],
    );
    expect(plan.pathUpdates).toEqual([]);
    expect(plan.redirectPairs).toEqual([]);
  });

  it("planPageSlugRename rejects sibling slug collision", () => {
    expect(() =>
      planPageSlugRename(
        { id: "1", path: "/en/a", slug: "a", lang: "en" },
        "b",
        [],
        ["b"],
      ),
    ).toThrow("SLUG_COLLISION");
  });

  it("planPageSlugRename rejects invalid slug", () => {
    expect(() =>
      planPageSlugRename({ id: "1", path: "/en/a", slug: "a", lang: "en" }, "   ", [], []),
    ).toThrow("SLUG_INVALID");
  });

  it("collectSiblingSlugs excludes self", () => {
    const slugs = collectSiblingSlugs(
      [
        { id: "1", slug: "a", path: "/en/a" },
        { id: "2", slug: "b", path: "/en/b" },
      ],
      "1",
      [],
      "en",
    );
    expect(slugs).toEqual(["b"]);
  });
});
