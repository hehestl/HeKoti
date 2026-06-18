import { describe, expect, it } from "vitest";
import type { PathTreeNode } from "@/lib/page-tree";
import type { WikiTreePage } from "@/lib/wiki-collection";
import {
  getRecommendedArticles,
  truncateExcerpt,
} from "@/lib/wiki-recommendations";

function page(id: string, path: string, title: string, navOrder = 0, excerpt?: string): WikiTreePage {
  return { id, path, title, navOrder, excerpt: excerpt ?? null };
}

function leaf(path: string, title: string, navOrder = 0, excerpt?: string): PathTreeNode<WikiTreePage> {
  const id = path.replace(/\//g, "-");
  return {
    pathKey: path,
    segment: path.split("/").pop()!,
    page: page(id, path, title, navOrder, excerpt),
    children: [],
  };
}

function catalog(path: string, segment: string, children: PathTreeNode<WikiTreePage>[]): PathTreeNode<WikiTreePage> {
  return { pathKey: path, segment, page: null, children };
}

const tree: PathTreeNode<WikiTreePage>[] = [
  catalog("/en/wallet", "wallet", [
    leaf("/en/wallet/fees", "Fees", 0),
    leaf("/en/wallet/limits", "Limits", 1),
  ]),
  catalog("/en/crypto", "crypto", [
    leaf("/en/crypto/api", "Crypto API", 0),
    leaf("/en/crypto/policy", "Policy", 1, "Long policy text ".repeat(20)),
  ]),
  leaf("/en/about", "About", 0),
];

describe("truncateExcerpt", () => {
  it("truncates long text to 120 chars", () => {
    const long = "a".repeat(150);
    const result = truncateExcerpt(long, 120);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(120);
  });

  it("returns null for empty", () => {
    expect(truncateExcerpt("")).toBeNull();
  });
});

describe("getRecommendedArticles", () => {
  it("returns siblings in same category excluding self", () => {
    const { siblings, neighbors } = getRecommendedArticles(tree, "/en/wallet/fees", "en", 1);
    expect(siblings.map((s) => s.path)).toEqual(["/en/wallet/limits"]);
    expect(neighbors).toHaveLength(0);
  });

  it("fills neighbors when only leaf in category", () => {
    const singleTree: PathTreeNode<WikiTreePage>[] = [
      catalog("/en/wallet", "wallet", [leaf("/en/wallet/fees", "Fees")]),
      catalog("/en/crypto", "crypto", [leaf("/en/crypto/api", "Crypto API")]),
    ];
    const { siblings, neighbors } = getRecommendedArticles(singleTree, "/en/wallet/fees", "en", 5);
    expect(siblings).toHaveLength(0);
    expect(neighbors.length).toBeGreaterThan(0);
    expect(neighbors.some((n) => n.path === "/en/crypto/api")).toBe(true);
  });

  it("handles root-level article siblings and neighbors", () => {
    const { siblings, neighbors } = getRecommendedArticles(tree, "/en/about", "en", 5);
    expect(siblings).toHaveLength(0);
    expect(neighbors.length).toBeGreaterThan(0);
  });

  it("respects limit across siblings and neighbors", () => {
    const bigTree: PathTreeNode<WikiTreePage>[] = [
      catalog("/en/a", "a", [leaf("/en/a/one", "One")]),
      catalog("/en/b", "b", [
        leaf("/en/b/two", "Two"),
        leaf("/en/b/three", "Three"),
        leaf("/en/b/four", "Four"),
      ]),
    ];
    const { siblings, neighbors } = getRecommendedArticles(bigTree, "/en/a/one", "en", 2);
    expect(siblings.length + neighbors.length).toBeLessThanOrEqual(2);
  });

  it("truncates excerpt in results", () => {
    const { neighbors } = getRecommendedArticles(tree, "/en/wallet/fees", "en", 5);
    const policy = neighbors.find((n) => n.path === "/en/crypto/policy");
    if (policy?.excerpt) {
      expect(policy.excerpt.length).toBeLessThanOrEqual(120);
    }
  });

  it("returns empty for unknown path", () => {
    const { siblings, neighbors } = getRecommendedArticles(tree, "/en", "en", 5);
    expect(siblings).toHaveLength(0);
    expect(neighbors).toHaveLength(0);
  });
});
