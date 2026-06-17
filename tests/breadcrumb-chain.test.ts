import { describe, expect, it } from "vitest";
import {
  breadcrumbChainForPage,
  buildBreadcrumbJsonLd,
  staticBreadcrumbChain,
} from "@/lib/wiki-collection";
import type { PathTreeNode } from "@/lib/page-tree";
import type { WikiTreePage } from "@/lib/wiki-collection";

const tree: PathTreeNode<WikiTreePage>[] = [
  {
    pathKey: "/en",
    segment: "",
    page: null,
    children: [
      {
        pathKey: "/en/wallet",
        segment: "wallet",
        page: null,
        children: [
          {
            pathKey: "/en/wallet/fees",
            segment: "fees",
            page: {
              id: "1",
              path: "/en/wallet/fees",
              title: "Fees and limits",
            },
            children: [],
          },
        ],
      },
    ],
  },
];

describe("breadcrumbChainForPage", () => {
  it("builds chain with page title as last crumb", () => {
    const chain = breadcrumbChainForPage(
      "/en/wallet/fees",
      "Fees and limits",
      "en",
      tree,
      "All collections",
    );
    expect(chain).toEqual([
      { label: "All collections", href: "/en" },
      { label: "Wallet", href: "/en/wiki/wallet" },
      { label: "Fees and limits" },
    ]);
  });
});

describe("staticBreadcrumbChain", () => {
  it("builds two-level chain without href on last item", () => {
    const chain = staticBreadcrumbChain("en", "All collections", "Donate");
    expect(chain).toEqual([
      { label: "All collections", href: "/en" },
      { label: "Donate" },
    ]);
    expect(chain[1]?.href).toBeUndefined();
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("maps items to BreadcrumbList with absolute URLs", () => {
    const items = staticBreadcrumbChain("en", "All collections", "Donate");
    const json = buildBreadcrumbJsonLd(items, "/en/donate", "https://wiki.example.com");
    expect(json).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "All collections",
          item: "https://wiki.example.com/en",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Donate",
          item: "https://wiki.example.com/en/donate",
        },
      ],
    });
  });
});
