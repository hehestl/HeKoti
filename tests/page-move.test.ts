import { describe, expect, it } from "vitest";
import {
  isMoveIntoDescendant,
  nextPagePath,
  planPageBranchMove,
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
});
