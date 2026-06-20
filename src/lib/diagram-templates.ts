export const DIAGRAM_TEMPLATES = {
  flowchartLr: `\`\`\`mermaid
flowchart LR
  A[Start] --> B[End]
\`\`\`
`,
  flowchartTb: `\`\`\`mermaid
flowchart TB
  A[Step 1] --> B[Step 2]
  B --> C[Step 3]
\`\`\`
`,
  sequence: `\`\`\`mermaid
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi
\`\`\`
`,
  state: `\`\`\`mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Active
  Active --> [*]
\`\`\`
`,
} as const;

export type DiagramTemplateKey = keyof typeof DIAGRAM_TEMPLATES;
