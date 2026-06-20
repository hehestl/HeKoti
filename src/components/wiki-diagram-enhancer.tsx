"use client";

import { useEffect } from "react";

type WikiDiagramEnhancerProps = {
  copyLabel: string;
  copiedLabel: string;
};

function decodeDiagramSourceClient(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function enhanceDiagrams(root: ParentNode, copyLabel: string, copiedLabel: string) {
  const figures = root.querySelectorAll<HTMLElement>(
    "figure.wiki-diagram[data-diagram-source]",
  );

  for (const figure of figures) {
    const encoded = figure.dataset.diagramSource;
    if (!encoded) continue;

    const btn = figure.querySelector<HTMLButtonElement>(".wiki-diagram-copy-btn");
    if (!btn || btn.dataset.bound === "1") continue;

    btn.dataset.bound = "1";
    btn.hidden = false;
    btn.textContent = copyLabel;
    btn.type = "button";

    btn.addEventListener("click", async () => {
      try {
        const source = decodeDiagramSourceClient(encoded);
        await navigator.clipboard.writeText(source);
        btn.textContent = copiedLabel;
        window.setTimeout(() => {
          btn.textContent = copyLabel;
        }, 1600);
      } catch {
        /* clipboard blocked */
      }
    });
  }
}

export function WikiDiagramEnhancer({ copyLabel, copiedLabel }: WikiDiagramEnhancerProps) {
  useEffect(() => {
    const run = () => enhanceDiagrams(document, copyLabel, copiedLabel);

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [copyLabel, copiedLabel]);

  return null;
}
