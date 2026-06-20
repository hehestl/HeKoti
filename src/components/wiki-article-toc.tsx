"use client";

import { useEffect, useId, useState } from "react";
import type { WikiHeading } from "@/lib/wiki-headings";

export function WikiArticleToc({
  headings,
  ariaLabel,
  toggleLabel,
}: {
  headings: WikiHeading[];
  ariaLabel: string;
  toggleLabel: string;
}) {
  const listId = useId();
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((n): n is HTMLElement => !!n);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [headings]);

  const nav = (
    <nav className="wiki-article-toc-nav" aria-label={ariaLabel}>
      <ul className="wiki-article-toc-list" id={listId}>
        {headings.map((h) => (
          <li key={h.id} className={`wiki-article-toc-item wiki-article-toc-level-${h.level}`}>
            <a
              href={`#${h.id}`}
              className={activeId === h.id ? "wiki-article-toc-link is-active" : "wiki-article-toc-link"}
              onClick={() => setActiveId(h.id)}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <aside className="wiki-article-toc">
      <button
        type="button"
        className="wiki-article-toc-mobile-toggle"
        aria-expanded={mobileOpen}
        aria-controls={listId}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {toggleLabel}
      </button>
      <div className={`wiki-article-toc-panel${mobileOpen ? " is-open" : ""}`}>{nav}</div>
    </aside>
  );
}
