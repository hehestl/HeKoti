"use client";

import type { ReactNode } from "react";
import { useCallback, useRef } from "react";
import { useWikiRepoSidebarWidth } from "@/hooks/use-wiki-repo-sidebar-width";

export function WikiRepoLayoutShell({
  sidebarHead,
  sidebar,
  children,
  resizeLabel,
}: {
  sidebarHead: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  resizeLabel: string;
}) {
  const { width, updateWidth } = useWikiRepoSidebarWidth();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      updateWidth(e.clientX - rect.left);
    },
    [updateWidth],
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.classList.remove("wiki-repo-resizing");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseMove]);

  const startDrag = () => {
    dragging.current = true;
    document.body.classList.add("wiki-repo-resizing");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div ref={layoutRef} className="repo-layout wiki-repo-layout">
      <aside className="repo-sidebar repo-sidebar-wiki" style={{ width, flexBasis: width }}>
        <div className="repo-sidebar-head">{sidebarHead}</div>
        {sidebar}
      </aside>
      <div
        className="repo-sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
        tabIndex={0}
        onMouseDown={startDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") updateWidth(width - 16);
          if (e.key === "ArrowRight") updateWidth(width + 16);
        }}
      />
      <main className="repo-main">{children}</main>
    </div>
  );
}
