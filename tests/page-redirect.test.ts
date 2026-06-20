import { describe, expect, it } from "vitest";
import { REDIRECT_TTL_DAYS, redirectExpiresAt } from "@/lib/page-redirect";
import { SLUG_MAX_LENGTH, validateSlugInput } from "@/lib/slug";

describe("page-redirect", () => {
  it("redirectExpiresAt is 7 days ahead", () => {
    const from = new Date("2026-01-01T12:00:00Z");
    const expires = redirectExpiresAt(from);
    expect(expires.getTime() - from.getTime()).toBe(REDIRECT_TTL_DAYS * 24 * 60 * 60 * 1000);
  });
});

describe("validateSlugInput", () => {
  it("accepts valid slug", () => {
    expect(validateSlugInput("My Page")).toBe("my-page");
  });

  it("rejects empty and too long", () => {
    expect(validateSlugInput("")).toBeNull();
    expect(validateSlugInput("a".repeat(SLUG_MAX_LENGTH + 1))).toBeNull();
  });
});
