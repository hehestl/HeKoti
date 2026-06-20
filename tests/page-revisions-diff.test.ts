import { describe, expect, it } from "vitest";
import { encodeRevisionCursor, parseRevisionCursor, resolveDiffRevisionIds } from "@/lib/page-revision-diff";

describe("resolveDiffRevisionIds", () => {
  const revisions = [
    { id: "r3", createdAt: new Date("2026-06-03T12:00:00Z") },
    { id: "r2", createdAt: new Date("2026-06-02T12:00:00Z") },
    { id: "r1", createdAt: new Date("2026-06-01T12:00:00Z") },
  ];

  it("defaults from to previous revision", () => {
    expect(resolveDiffRevisionIds(revisions, { to: "r2" })).toEqual({
      fromId: "r1",
      toId: "r2",
    });
  });

  it("supports compare with current", () => {
    expect(resolveDiffRevisionIds(revisions, { to: "current" })).toEqual({
      fromId: "r3",
      toId: "current",
    });
  });

  it("allows explicit from id", () => {
    expect(resolveDiffRevisionIds(revisions, { from: "r1", to: "r3" })).toEqual({
      fromId: "r1",
      toId: "r3",
    });
  });
});

describe("revision cursor", () => {
  it("round-trips cursor encoding", () => {
    const createdAt = new Date("2026-06-01T10:00:00.000Z");
    const cursor = encodeRevisionCursor(createdAt, "abc");
    expect(parseRevisionCursor(cursor)).toEqual({ createdAt, id: "abc" });
  });
});
