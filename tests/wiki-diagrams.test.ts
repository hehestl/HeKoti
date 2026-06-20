import { describe, expect, it } from "vitest";
import { extractDiagramBlocks } from "@/lib/wiki-diagrams";

describe("extractDiagramBlocks", () => {
  it("extracts mermaid fence and alt line", () => {
    const md = `# Title

\`\`\`mermaid
flowchart LR
  A-->B
\`\`\`
alt: Test diagram

Next paragraph.`;

    const { markdown, blocks } = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("mermaid");
    if (blocks[0]?.kind === "mermaid") {
      expect(blocks[0].source).toContain("flowchart LR");
      expect(blocks[0].alt).toBe("Test diagram");
    }
    expect(markdown).toContain('<span data-hekoti-diagram="0"></span>');
    expect(markdown).not.toContain("```mermaid");
    expect(markdown).toContain("Next paragraph.");
  });

  it("extracts svg fence", () => {
    const md = `\`\`\`svg
<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>
\`\`\``;
    const { blocks } = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("svg");
  });

  it("handles empty mermaid block", () => {
    const md = "```mermaid\n\n```";
    const { blocks } = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("mermaid");
    if (blocks[0]?.kind === "mermaid") expect(blocks[0].source).toBe("");
  });

  it("handles indented mermaid fence", () => {
    const md = "  ```mermaid\nflowchart LR\n  A-->B\n  ```";
    const { blocks, markdown } = extractDiagramBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("mermaid");
    expect(markdown).toContain('<span data-hekoti-diagram="0"></span>');
  });
});
