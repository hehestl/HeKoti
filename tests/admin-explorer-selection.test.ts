import { describe, expect, it } from "vitest";
import { buildPathTree } from "@/lib/page-tree";
import {
  collectVisibleTreePages,
  explorerSelectionKey,
  expandablePathKeysForPages,
  parseExplorerSelectionKey,
  resolveSelectedPages,
  selectRangeKeys,
} from "@/lib/admin-explorer-selection";
import type { AdminPageRow } from "@/types/admin-workbench";

function page(id: string, path: string, extra: Partial<AdminPageRow> = {}): AdminPageRow {
  const slug = path.split("/").pop() ?? id;
  return {
    id,
    lang: "en",
    path,
    slug,
    title: id,
    contentMd: "",
    navOrder: 0,
    isCategory: false,
    isPublished: true,
    icon: null,
    systemKey: null,
    showToc: true,
    scope: "WIKI",
    ...extra,
  };
}

describe("admin-explorer-selection", () => {
  it("explorerSelectionKey round-trips via parse", () => {
    const key = explorerSelectionKey("en", "abc");
    expect(parseExplorerSelectionKey(key)).toEqual({ lang: "en", pageId: "abc" });
  });

  it("collectVisibleTreePages respects collapsed branches", () => {
    const pages = [
      page("1", "/en/a"),
      page("2", "/en/a/b"),
      page("3", "/en/c"),
    ];
    const tree = buildPathTree(pages, "en");
    const open = new Set<string>();
    const visible = collectVisibleTreePages(tree, open);
    expect(visible.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("selectRangeKeys selects inclusive visible range", () => {
    const pages = [page("1", "/en/a"), page("2", "/en/b"), page("3", "/en/c")];
    const anchor = explorerSelectionKey("en", "1");
    const target = explorerSelectionKey("en", "3");
    const keys = selectRangeKeys(pages, anchor, target);
    expect([...keys]).toEqual(["en:1", "en:2", "en:3"]);
  });

  it("resolveSelectedPages maps keys to rows", () => {
    const p = page("x", "/en/x");
    const selected = new Set([explorerSelectionKey("en", "x")]);
    const rows = resolveSelectedPages(selected, { en: [p] });
    expect(rows).toEqual([p]);
  });

  it("expandablePathKeysForPages includes category and parent paths", () => {
    const all = [
      page("1", "/en/docs", { isCategory: true }),
      page("2", "/en/docs/guide"),
    ];
    const keys = expandablePathKeysForPages([all[0]!], all);
    expect(keys.has("/en/docs")).toBe(true);
  });
});
