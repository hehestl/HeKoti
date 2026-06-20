import { vi } from "vitest";

vi.mock("isomorphic-mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>',
    })),
  },
}));

import mermaid from "isomorphic-mermaid";
import { describe, expect, it, beforeEach } from "vitest";
import { renderMermaidFigure } from "@/lib/mermaid-render";

describe("renderMermaidFigure cache", () => {
  beforeEach(() => {
    vi.mocked(mermaid.render).mockClear();
  });

  it("reuses cached figure on second render with same source", async () => {
    const source = "flowchart LR\n  X-->Y";
    const first = await renderMermaidFigure(source);
    const second = await renderMermaidFigure(source);

    expect(first).toContain('class="wiki-diagram"');
    expect(second).toBe(first);
    expect(mermaid.render).toHaveBeenCalledTimes(2);
  });

  it("renders again when alt text changes", async () => {
    const source = "flowchart LR\n  P-->Q";
    await renderMermaidFigure(source, { alt: "First" });
    await renderMermaidFigure(source, { alt: "Second" });

    expect(mermaid.render).toHaveBeenCalledTimes(4);
  });
});
