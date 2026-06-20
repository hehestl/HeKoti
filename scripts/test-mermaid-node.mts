import "../src/lib/mermaid-server-env";
import { renderMermaidFigure } from "../src/lib/mermaid-render";

const html = await renderMermaidFigure("flowchart LR\n  A-->B");
console.log("ok", html.includes("wiki-diagram"), "globals.window", globalThis.window === undefined);
