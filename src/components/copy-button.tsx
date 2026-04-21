"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "transparent",
        color: "var(--fg)",
        padding: "4px 8px",
        marginLeft: 8,
      }}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}
