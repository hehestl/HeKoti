import { describe, expect, it } from "vitest";
import { SYSTEM_NOTE_KEYS } from "@/lib/system-notes";
import { wikiPageWhere, notesPageWhere } from "@/lib/page-query";

describe("page scope filters", () => {
  it("wikiPageWhere excludes notes scope", () => {
    expect(wikiPageWhere).toEqual({ scope: "WIKI", deletedAt: null });
  });

  it("notesPageWhere targets NOTES only", () => {
    expect(notesPageWhere).toEqual({ scope: "NOTES", deletedAt: null });
  });
});

describe("system note keys", () => {
  it("defines welcome and support keys", () => {
    expect(SYSTEM_NOTE_KEYS).toEqual(["hekoti-welcome", "hekoti-support"]);
  });
});
