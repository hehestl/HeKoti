import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown sanitization", () => {
  it("strips inline style attributes", () => {
    const html = renderMarkdown('<span style="color:red">x</span>');
    expect(html).not.toContain("style=");
    expect(html).toContain("x");
  });

  it("strips script tags", () => {
    const html = renderMarkdown('<script>alert(1)</script>hello');
    expect(html).not.toContain("<script");
    expect(html).toContain("hello");
  });
});