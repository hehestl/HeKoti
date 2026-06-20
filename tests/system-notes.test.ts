import { describe, expect, it } from "vitest";
import { SYSTEM_NOTE_KEYS } from "@/lib/system-notes";
import { normalizePath } from "@/lib/slug";

describe("system notes", () => {
  it("defines two protected system keys", () => {
    expect(SYSTEM_NOTE_KEYS).toHaveLength(2);
    expect(SYSTEM_NOTE_KEYS).toContain("hekoti-welcome");
    expect(SYSTEM_NOTE_KEYS).toContain("hekoti-support");
  });

  it("notes paths use notes segment", () => {
    expect(normalizePath("en", ["notes", "hekoti-welcome"])).toBe("/en/notes/hekoti-welcome");
    expect(normalizePath("ru", ["notes", "hekoti-support"])).toBe("/ru/notes/hekoti-support");
  });
});
