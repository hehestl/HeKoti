import { describe, expect, it } from "vitest";
import {
  buildPatchPayloads,
  calculateSiblingOrders,
  getParentPathParts,
  isReorderError,
  parentPathKeyFromParts,
  parentPathPartsFromPathKey,
  resolveMoveTarget,
  type PatchableRow,
  type ReorderPageRow,
} from "@/lib/page-reorder";

const lang = "en";

function page(id: string, path: string, navOrder: number): ReorderPageRow {
  return { id, path, navOrder };
}

describe("getParentPathParts", () => {
  it("returns empty for root-level page", () => {
    expect(getParentPathParts("/en/a", lang)).toEqual([]);
  });

  it("returns parent segments for nested page", () => {
    expect(getParentPathParts("/en/a/c", lang)).toEqual(["a"]);
  });
});

describe("parentPathKeyFromParts", () => {
  it("maps root and nested keys", () => {
    expect(parentPathKeyFromParts(lang, [])).toBe("/en");
    expect(parentPathKeyFromParts(lang, ["wallet"])).toBe("/en/wallet");
  });
});

describe("parentPathPartsFromPathKey", () => {
  it("inverts pathKey to parent parts", () => {
    expect(parentPathPartsFromPathKey("/en", lang)).toEqual([]);
    expect(parentPathPartsFromPathKey("/en/wallet/fees", lang)).toEqual(["wallet"]);
  });
});

describe("calculateSiblingOrders", () => {
  const pages = [
    page("a", "/en/a", 0),
    page("b", "/en/b", 10),
    page("c", "/en/a/c", 0),
  ];

  it("reorders before target among root siblings", () => {
    const result = calculateSiblingOrders(lang, pages, "b", [], "a", "before");
    expect(isReorderError(result)).toBe(false);
    if (isReorderError(result)) return;
    expect(result.find((p) => p.id === "b")?.navOrder).toBe(0);
    expect(result.find((p) => p.id === "a")?.navOrder).toBe(10);
  });

  it("reorders after target among root siblings", () => {
    const result = calculateSiblingOrders(lang, pages, "a", [], "b", "after");
    expect(isReorderError(result)).toBe(false);
    if (isReorderError(result)) return;
    expect(result.find((p) => p.id === "a")?.navOrder).toBe(10);
    expect(result.find((p) => p.id === "b")?.navOrder).toBe(0);
  });

  it("sorts siblings by navOrder before insert", () => {
    const shuffled = [
      page("b", "/en/b", 10),
      page("a", "/en/a", 0),
      page("c", "/en/c", 20),
    ];
    const result = calculateSiblingOrders(lang, shuffled, "c", [], "a", "before");
    expect(isReorderError(result)).toBe(false);
    if (isReorderError(result)) return;
    const byId = new Map(result.map((p) => [p.id, p.navOrder]));
    expect(byId.get("c")).toBe(0);
    expect(byId.get("a")).toBe(10);
    expect(byId.get("b")).toBe(20);
  });

  it("moves inside folder with parentPathParts", () => {
    const result = calculateSiblingOrders(lang, pages, "b", ["a"], null, "inside");
    expect(isReorderError(result)).toBe(false);
    if (isReorderError(result)) return;
    const moved = result.find((p) => p.id === "b");
    expect(moved?.parentPathParts).toEqual(["a"]);
  });

  it("blocks move into descendant", () => {
    const nested = [page("a", "/en/a", 0), page("c", "/en/a/c", 0)];
    const result = calculateSiblingOrders(lang, nested, "a", ["a", "c"], null, "inside");
    expect(result).toEqual({ error: "INTO_DESCENDANT" });
  });

  it("returns NOT_FOUND for unknown id", () => {
    expect(calculateSiblingOrders(lang, pages, "missing", [], null, "after")).toEqual({
      error: "NOT_FOUND",
    });
  });
});

describe("resolveMoveTarget", () => {
  const pages = [page("a", "/en/a", 0), page("c", "/en/a/c", 10)];

  it("resolves root drop", () => {
    expect(resolveMoveTarget(lang, pages, { kind: "root" })).toEqual({
      newParentParts: [],
      targetPageId: null,
      mode: "after",
    });
  });

  it("resolves folder drop", () => {
    expect(resolveMoveTarget(lang, pages, { kind: "folder", pathKey: "/en/a" })).toEqual({
      newParentParts: ["a"],
      targetPageId: null,
      mode: "inside",
    });
  });

  it("resolves page drop before", () => {
    expect(
      resolveMoveTarget(lang, pages, { kind: "page", targetId: "c", mode: "before" }),
    ).toEqual({
      newParentParts: ["a"],
      targetPageId: "c",
      mode: "before",
    });
  });
});

describe("buildPatchPayloads", () => {
  it("diffs only changed fields", () => {
    const baseline = new Map<string, PatchableRow>([
      [
        "/en/wallet",
        {
          id: "1",
          pathKey: "/en/wallet",
          title: "Wallet",
          icon: null,
          navOrder: 0,
          parentPathKey: "/en",
        },
      ],
    ]);
    const draft = new Map<string, PatchableRow>([
      [
        "/en/wallet",
        {
          id: "1",
          pathKey: "/en/wallet",
          title: "Wallet v2",
          icon: "coins",
          navOrder: 10,
          parentPathKey: "/en",
        },
      ],
    ]);

    const patches = buildPatchPayloads(baseline, draft, lang);
    expect(patches).toHaveLength(1);
    expect(patches[0]?.payload).toEqual({
      title: "Wallet v2",
      icon: "coins",
      navOrder: 10,
    });
  });

  it("skips implicit rows without id", () => {
    const draft = new Map<string, PatchableRow>([
      [
        "/en/new",
        {
          id: "",
          pathKey: "/en/new",
          title: "New",
          icon: null,
          navOrder: 0,
          parentPathKey: "/en",
        },
      ],
    ]);
    expect(buildPatchPayloads(new Map(), draft, lang)).toEqual([]);
  });
});
