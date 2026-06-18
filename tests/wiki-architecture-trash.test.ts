import { describe, expect, it } from "vitest";
import {
  diffArchitecture,
  parseArchitectureMarkdown,
  serializeArchitectureTree,
  type ArchPageRef,
} from "@/lib/wiki-architecture-md";
import {
  daysUntilPurge,
  isPurgeEligible,
  purgeAtFromDeletedAt,
  SOFT_DELETE_RETENTION_DAYS,
} from "@/lib/page-trash";

describe("wiki-architecture-md", () => {
  it("parses tree lines with depth and .md suffix", () => {
    const md = `\`\`\`
hekoti-docs #
├── Folder #
│   └── Article.md #
\`\`\``;
    const nodes = parseArchitectureMarkdown(md);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ title: "Folder", isCategory: true, depth: 0 });
    expect(nodes[1]).toMatchObject({ title: "Article", isCategory: false, depth: 1 });
  });

  it("serializes pages to markdown block", () => {
    const md = serializeArchitectureTree(
      [
        {
          id: "1",
          path: "/en/folder",
          title: "Folder",
          isCategory: true,
          navOrder: 0,
        },
        {
          id: "2",
          path: "/en/folder/article",
          title: "Article",
          isCategory: false,
          navOrder: 0,
        },
      ],
      "en",
    );
    expect(md).toContain("## Project Structure");
    expect(md).toContain("Folder");
    expect(md).toContain("Article.md");
  });

  it("diff detects create and soft delete", () => {
    const current: ArchPageRef[] = [
      {
        id: "a",
        path: "/en/old",
        title: "Old",
        isCategory: false,
        lang: "en",
        slug: "old",
      },
    ];
    const parsed = parseArchitectureMarkdown("```\n├── New Page.md\n```");
    const ops = diffArchitecture(current, parsed, "en");
    expect(ops.some((o) => o.type === "create" && o.title === "New Page")).toBe(true);
    expect(ops.some((o) => o.type === "softDelete" && o.id === "a")).toBe(true);
  });
});

describe("page-trash", () => {
  it("retention is 3 days", () => {
    expect(SOFT_DELETE_RETENTION_DAYS).toBe(3);
  });

  it("purgeAt is deletedAt + 3 days", () => {
    const deletedAt = new Date("2026-06-17T12:00:00Z");
    const purgeAt = purgeAtFromDeletedAt(deletedAt);
    expect(purgeAt.getTime() - deletedAt.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("isPurgeEligible after retention window", () => {
    const deletedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    expect(isPurgeEligible(deletedAt)).toBe(true);
    expect(daysUntilPurge(new Date())).toBeGreaterThan(0);
  });
});
