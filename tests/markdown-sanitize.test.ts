import { vi } from "vitest";

vi.mock("@/lib/wiki-link-index", () => ({
  getWikiLinkPages: vi.fn(async () => []),
}));

import { describe, expect, it } from "vitest";
import { renderMarkdown, renderWikiHtml } from "@/lib/markdown";
import { sanitizeDiagramSvg } from "@/lib/svg-sanitize";

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

  it("keeps video tags with controls", () => {
    const html = renderMarkdown('<video src="https://cdn.example.com/a.mp4" controls playsinline></video>');
    expect(html).toContain("<video");
    expect(html).toContain('src="https://cdn.example.com/a.mp4"');
    expect(html).toContain("controls");
  });

  it("strips javascript src from video", () => {
    const html = renderMarkdown('<video src="javascript:alert(1)" controls></video>');
    expect(html).not.toContain("javascript:");
  });
});

describe("sanitizeDiagramSvg", () => {
  it("strips script inside svg", () => {
    const svg = '<svg><script>alert(1)</script><circle cx="1" cy="1" r="1"/></svg>';
    const out = sanitizeDiagramSvg(svg);
    expect(out).not.toContain("<script");
    expect(out).toContain("<circle");
  });

  it("strips foreignObject", () => {
    const svg = '<svg><foreignObject><div>x</div></foreignObject></svg>';
    const out = sanitizeDiagramSvg(svg);
    expect(out).not.toContain("foreignObject");
  });

  it("strips onload handlers", () => {
    const svg = '<svg onload="alert(1)"><circle cx="1" cy="1" r="1"/></svg>';
    const out = sanitizeDiagramSvg(svg);
    expect(out).not.toContain("onload");
  });

  it("strips javascript href", () => {
    const svg = '<svg><a href="javascript:alert(1)">x</a></svg>';
    const out = sanitizeDiagramSvg(svg);
    expect(out).not.toContain("javascript:");
  });

  it("strips data href", () => {
    const svg = '<svg><a href="data:text/html,<script>alert(1)</script>">x</a></svg>';
    const out = sanitizeDiagramSvg(svg);
    expect(out).not.toContain("data:");
  });

  it("strips onclick handlers", () => {
    const svg = '<svg><circle cx="1" cy="1" r="1" onclick="alert(1)"/></svg>';
    const out = sanitizeDiagramSvg(svg);
    expect(out).not.toContain("onclick");
  });
});

describe("renderWikiHtml diagrams", () => {
  it("renders mermaid fence to figure with svg layers", async () => {
    const md = "```mermaid\nflowchart LR\n  A-->B\n```";
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain('class="wiki-diagram"');
    expect(html).toContain("wiki-diagram-svg--light");
    expect(html).toContain("wiki-diagram-svg--dark");
    expect(html).toMatch(/<svg/i);
  }, 30_000);

  it("renders invalid mermaid as error block", async () => {
    const md = "```mermaid\nthis is not valid mermaid {{{\n```";
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain("wiki-diagram-error");
  }, 30_000);

  it("renders svg fence", async () => {
    const md =
      '```svg\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>\n```';
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain('class="wiki-diagram"');
    expect(html).toContain("<circle");
  });

  it("includes alt caption when provided", async () => {
    const md = "```mermaid\nflowchart LR\n  A-->B\n```\nalt: My diagram";
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain("wiki-diagram-sr-only");
    expect(html).toContain("My diagram");
    expect(html).toContain('role="img"');
    expect(html).toContain("aria-labelledby=");
  }, 30_000);

  it("renders empty mermaid as error block", async () => {
    const md = "```mermaid\n\n```";
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain("wiki-diagram-error");
  }, 30_000);

  it("renders nested subgraph flowchart", async () => {
    const md = `\`\`\`mermaid
flowchart TB
  subgraph outer["Outer"]
    A --> B
    subgraph inner["Inner"]
      B --> C
    end
  end
\`\`\``;
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain('class="wiki-diagram"');
    expect(html).toMatch(/<svg/i);
  }, 30_000);

  it("renders sequenceDiagram", async () => {
    const md = `\`\`\`mermaid
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi
\`\`\``;
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain('class="wiki-diagram"');
    expect(html).toMatch(/<svg/i);
  }, 30_000);

  it("wraps orphan inline svg in figure", async () => {
    const md =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
    const html = await renderWikiHtml(md, "en");
    expect(html).toContain('class="wiki-diagram"');
    expect(html).toContain("<circle");
  });
});
