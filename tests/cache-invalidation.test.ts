import { describe, expect, it } from "vitest";
import { getCached, invalidateSearchLangCache, invalidateWikiLangCache, setCached } from "@/lib/cache";

describe("cache invalidation", () => {
  it("invalidates search cache by language prefix", async () => {
    await setCached("search:en:test-query", JSON.stringify({ ok: 1 }), 60);
    await setCached("search:suggest:en:docker:8", JSON.stringify({ items: [] }), 60);
    await setCached("search:ru:test-query", JSON.stringify({ ok: 2 }), 60);

    await invalidateSearchLangCache("en");

    expect(await getCached("search:en:test-query")).toBeNull();
    expect(await getCached("search:suggest:en:docker:8")).toBeNull();
    expect(await getCached("search:ru:test-query")).not.toBeNull();
  });

  it("invalidates wiki cache by language prefix", async () => {
    await setCached("wiki:en:path1", "a", 60);
    await setCached("wiki:ru:path1", "b", 60);

    await invalidateWikiLangCache("en");

    expect(await getCached("wiki:en:path1")).toBeNull();
    expect(await getCached("wiki:ru:path1")).toBe("b");
  });

  it("invalidates wiki link index cache by language", async () => {
    await setCached("wiki-links:en", JSON.stringify([{ path: "/en/a", title: "A" }]), 60);
    await setCached("wiki-links:ru", JSON.stringify([{ path: "/ru/a", title: "A" }]), 60);

    await invalidateWikiLangCache("en");

    expect(await getCached("wiki-links:en")).toBeNull();
    expect(await getCached("wiki-links:ru")).not.toBeNull();
  });
});
