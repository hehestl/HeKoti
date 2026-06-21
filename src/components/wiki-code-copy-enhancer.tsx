"use client";

import { useEffect } from "react";

export function WikiCodeCopyEnhancer({
  copyLabel,
  copiedLabel,
}: {
  copyLabel: string;
  copiedLabel: string;
}) {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>(".wiki-article-body pre");
    for (const pre of blocks) {
      if (pre.closest(".wiki-diagram")) continue;
      if (pre.dataset.hekotiCodeCopy === "1") continue;
      pre.dataset.hekotiCodeCopy = "1";

      const wrap = document.createElement("div");
      wrap.className = "wiki-code-block-wrap";
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const toolbar = document.createElement("div");
      toolbar.className = "wiki-code-toolbar";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wiki-code-copy-btn";
      btn.textContent = copyLabel;
      toolbar.appendChild(btn);
      wrap.insertBefore(toolbar, pre);

      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const text = (code ?? pre).textContent ?? "";
        void navigator.clipboard.writeText(text).then(() => {
          btn.textContent = copiedLabel;
          window.setTimeout(() => {
            btn.textContent = copyLabel;
          }, 1500);
        });
      });
    }
  }, [copyLabel, copiedLabel]);

  return null;
}
