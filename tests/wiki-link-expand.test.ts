import { describe, expect, it } from "vitest";
import { resolvePostWikiTarget } from "@/lib/wiki-link-expand";

describe("resolvePostWikiTarget", () => {
  const pages = [
    { path: "/en/docs/api", title: "API" },
    { path: "/en/guides/docker", title: "Docker" },
  ];

  it("resolves exact path tail", () => {
    const hit = resolvePostWikiTarget("docs/api", "en", pages);
    expect(hit?.href).toBe("/en/wiki/docs/api");
    expect(hit?.title).toBe("API");
  });

  it("resolves shortest suffix match", () => {
    const hit = resolvePostWikiTarget("docker", "en", pages);
    expect(hit?.title).toBe("Docker");
  });

  it("returns null for unknown slug", () => {
    expect(resolvePostWikiTarget("missing", "en", pages)).toBeNull();
  });
});
