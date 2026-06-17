import { describe, expect, it } from "vitest";
import { breadcrumbChainForPage } from "@/lib/wiki-collection";
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
