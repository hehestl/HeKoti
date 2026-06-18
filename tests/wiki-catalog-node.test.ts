import { describe, expect, it } from "vitest";
import type { PathTreeNode } from "@/lib/page-tree";
import {
  buildCatalogJsonLd,
  countDescendantPages,
  getNodeUrl,
  getWikiNodeType,
  hasPublishedPage,
  isCollectionNode,
  isWikiCatalogNode,
  isWikiLeafArticle,
  type WikiTreePage,
} from "@/lib/wiki-collection";

function makePage(path: string, title: string): WikiTreePage {
  return { id: path, path, title };
}

const leaf: PathTreeNode<WikiTreePage> = {
  pathKey: "/en/guide/start",
  segment: "start",
  page: makePage("/en/guide/start", "Getting started"),
  children: [],
};

const implicitCatalog: PathTreeNode<WikiTreePage> = {
  pathKey: "/en/wallet",
  segment: "wallet",
  page: null,
  children: [leaf],
};

const hybridCatalog: PathTreeNode<WikiTreePage> = {
  pathKey: "/en/crypto-pay",
  segment: "crypto-pay",
  page: makePage("/en/crypto-pay", "Crypto Pay"),
  children: [
    {
      pathKey: "/en/crypto-pay/fees",
      segment: "fees",
      page: makePage("/en/crypto-pay/fees", "Fees"),
      children: [],
    },
    {
      pathKey: "/en/crypto-pay/api",
      segment: "api",
      page: makePage("/en/crypto-pay/api", "API"),
      children: [],
    },
  ],
};

describe("wiki catalog node helpers", () => {
  it("classifies leaf as article", () => {
    expect(isWikiCatalogNode(leaf)).toBe(false);
    expect(isWikiLeafArticle(leaf)).toBe(true);
    expect(getWikiNodeType(leaf)).toBe("article");
    expect(isCollectionNode(leaf)).toBe(false);
  });

  it("classifies implicit prefix as catalog", () => {
    expect(isWikiCatalogNode(implicitCatalog)).toBe(true);
    expect(isWikiLeafArticle(implicitCatalog)).toBe(false);
    expect(getWikiNodeType(implicitCatalog)).toBe("catalog");
    expect(isCollectionNode(implicitCatalog)).toBe(true);
  });

  it("classifies parent with page and children as catalog", () => {
    expect(isWikiCatalogNode(hybridCatalog)).toBe(true);
    expect(getWikiNodeType(hybridCatalog)).toBe("catalog");
    expect(isCollectionNode(hybridCatalog)).toBe(true);
  });

  it("returns missing for null node", () => {
    expect(getWikiNodeType(null)).toBe("missing");
    expect(isWikiCatalogNode(null)).toBe(false);
  });
});

describe("getNodeUrl", () => {
  it("links catalog parent to its wiki URL", () => {
    expect(getNodeUrl(hybridCatalog, "en")).toBe("/en/wiki/crypto-pay");
  });

  it("links leaf to article URL", () => {
    expect(getNodeUrl(leaf, "en")).toBe("/en/wiki/guide/start");
  });
});

describe("countDescendantPages", () => {
  it("counts nested pages under hybrid catalog", () => {
    expect(countDescendantPages(hybridCatalog)).toBe(3);
  });
});

describe("hasPublishedPage", () => {
  it("detects published page record", () => {
    expect(hasPublishedPage({ isPublished: true })).toBe(true);
    expect(hasPublishedPage({ isPublished: false })).toBe(false);
    expect(hasPublishedPage(null)).toBe(false);
  });
});

describe("buildCatalogJsonLd", () => {
  it("builds CollectionPage with ItemList and absolute URLs", () => {
    const json = buildCatalogJsonLd(
      "Crypto Pay",
      "How to accept payments",
      "/en/wiki/crypto-pay",
      [
        { title: "Fees", url: "/en/wiki/crypto-pay/fees" },
        { title: "API", url: "/en/wiki/crypto-pay/api" },
      ],
      "https://wiki.example.com",
    );

    expect(json).toEqual({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Crypto Pay",
      description: "How to accept payments",
      url: "https://wiki.example.com/en/wiki/crypto-pay",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 2,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Fees",
            url: "https://wiki.example.com/en/wiki/crypto-pay/fees",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "API",
            url: "https://wiki.example.com/en/wiki/crypto-pay/api",
          },
        ],
      },
    });
  });
});
