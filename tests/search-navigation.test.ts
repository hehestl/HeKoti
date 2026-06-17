import { describe, expect, it } from "vitest";
import { resolveSearchNavigation } from "@/lib/search-navigation";

describe("resolveSearchNavigation", () => {
  it("routes plain login and admin", () => {
    expect(resolveSearchNavigation("en", "login")).toBe("/en/login");
    expect(resolveSearchNavigation("en", "admin")).toBe("/en/login");
    expect(resolveSearchNavigation("ru", "ADMIN")).toBe("/ru/login");
  });

  it("routes slash and command prefixes", () => {
    expect(resolveSearchNavigation("en", ">login")).toBe("/en/login");
    expect(resolveSearchNavigation("en", ">admin")).toBe("/en/login");
    expect(resolveSearchNavigation("en", "/a")).toBe("/en/login");
    expect(resolveSearchNavigation("en", "/l")).toBe("/en/login");
    expect(resolveSearchNavigation("en", "/login")).toBe("/en/login");
    expect(resolveSearchNavigation("en", "/admin")).toBe("/en/login");
  });

  it("does not intercept single-letter search", () => {
    expect(resolveSearchNavigation("en", "a")).toBeNull();
    expect(resolveSearchNavigation("en", "l")).toBeNull();
  });

  it("does not intercept normal queries", () => {
    expect(resolveSearchNavigation("en", "docker")).toBeNull();
    expect(resolveSearchNavigation("en", "how to login safely")).toBeNull();
  });
});
