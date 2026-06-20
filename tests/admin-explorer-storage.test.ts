import { describe, expect, it } from "vitest";
import {
  explorerBranchesKey,
  explorerLangsKey,
  loadOpenBranchesState,
} from "@/lib/admin-explorer-storage";
import type { AdminPageRow } from "@/types/admin-workbench";

function page(id: string, path: string): AdminPageRow {
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
  };
}

describe("admin-explorer-storage", () => {
  it("uses variant-scoped localStorage keys", () => {
    expect(explorerLangsKey("posts")).toBe("admin-explorer-langs-posts");
    expect(explorerBranchesKey("notes")).toBe("admin-explorer-branches-notes");
  });

  it("loadOpenBranchesState prefers stored keys over expand-all default", () => {
    const pages = [page("1", "/en/a"), page("2", "/en/a/b")];
    const stored = { en: ["/en/a"] };
    const state = loadOpenBranchesState(["en"], { en: pages }, "posts", stored);
    expect([...state.en!]).toEqual(["/en/a"]);
  });

  it("loadOpenBranchesState drops invalid stored path keys", () => {
    const pages = [page("1", "/en/a")];
    const stored = { en: ["/en/a", "/en/removed"] };
    const state = loadOpenBranchesState(["en"], { en: pages }, "posts", stored);
    expect([...state.en!]).toEqual(["/en/a"]);
  });

  it("loadOpenBranchesState treats empty stored array as collapsed", () => {
    const pages = [page("1", "/en/a"), page("2", "/en/a/b")];
    const stored = { en: [] as string[] };
    const state = loadOpenBranchesState(["en"], { en: pages }, "posts", stored);
    expect([...state.en!]).toEqual([]);
  });
});
