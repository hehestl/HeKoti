import { describe, expect, it } from "vitest";
import {
  contentHash,
  contentLineStats,
  contentSizeBytes,
  diffRevisionMetadata,
  generateRevisionSummary,
  isSignificantChange,
  pageToRevisionSnapshot,
} from "@/lib/page-revision-snapshot";

function snap(overrides: Partial<ReturnType<typeof pageToRevisionSnapshot>> = {}) {
  return {
    title: "Title",
    contentMd: "line1\nline2",
    slug: "title",
    path: "/en/title",
    icon: null,
    isPublished: true,
    showToc: true,
    isCategory: false,
    navOrder: 0,
    ...overrides,
  };
}

describe("isSignificantChange", () => {
  it("skips navOrder-only changes", () => {
    const prev = snap();
    const next = snap({ navOrder: 20 });
    expect(isSignificantChange(prev, next)).toBe(false);
  });

  it("detects title changes", () => {
    expect(isSignificantChange(snap(), snap({ title: "New" }))).toBe(true);
  });

  it("treats creation as significant", () => {
    expect(isSignificantChange(null, snap())).toBe(true);
  });
});

describe("contentLineStats", () => {
  it("counts added and removed lines", () => {
    const stats = contentLineStats("a\nb", "a\nc\nd");
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(1);
  });
});

describe("generateRevisionSummary", () => {
  it("marks created revisions", () => {
    expect(generateRevisionSummary(null, snap())).toBe("created");
  });

  it("includes line stats and changed fields", () => {
    const summary = generateRevisionSummary(snap(), snap({ contentMd: "x\ny\nz", title: "New" }));
    expect(summary).toContain("lines");
    expect(summary).toContain("title");
  });
});

describe("diffRevisionMetadata", () => {
  it("flags changed metadata rows", () => {
    const rows = diffRevisionMetadata(snap(), snap({ icon: "folder" }));
    const iconRow = rows.find((r) => r.field === "icon");
    expect(iconRow?.changed).toBe(true);
  });
});

describe("contentHash / contentSizeBytes", () => {
  it("hashes and measures content", () => {
    const md = "# Hello";
    expect(contentHash(md)).toHaveLength(64);
    expect(contentSizeBytes(md)).toBe(Buffer.byteLength(md, "utf8"));
  });
});

describe("pageToRevisionSnapshot", () => {
  it("maps page fields", () => {
    const s = pageToRevisionSnapshot({
      title: "A",
      contentMd: "body",
      slug: "a",
      path: "/en/a",
      icon: "book",
      isPublished: false,
      showToc: false,
      isCategory: true,
      navOrder: 10,
    });
    expect(s.path).toBe("/en/a");
    expect(s.navOrder).toBe(10);
  });
});
