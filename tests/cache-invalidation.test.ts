import { describe, expect, it } from "vitest";
import { getCached, invalidateSearchLangCache, invalidateWikiLangCache, setCached } from "@/lib/cache";

describe("cache invalidation", () => {
  it("invalidates search cache by language prefix", async () => {
    await setCached("search:en:test-query", JSON.stringify({ ok: 1 }), 60);
    await setCached("search:ru:test-query", JSON.stringify({ ok: 2 }), 60);

    await invalidateSearchLangCache("en");

    expect(await getCached("search:en:test-query")).toBeNull();
    expect(await getCached("search:ru:test-query")).not.toBeNull();
  });

  it("invalidates wiki cache by language prefix", async () => {
    await setCached("wiki:en:path1", "a", 60);
    await setCached("wiki:ru:path1", "b", 60);

    await invalidateWikiLangCache("en");

    expect(await getCached("wiki:en:path1")).toBeNull();
    expect(await getCached("wiki:ru:path1")).toBe("b");
  });
});
