"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AdminContextMenuItem } from "@/types/admin-workbench";

const VIEWPORT_OFFSET = 8;

export function AdminContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: AdminContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ x: -9999, y: -9999 });
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    setVisible(false);
    const el = ref.current;
    if (!el) return;

    const menuRect = el.getBoundingClientRect();
    let targetX = x;
    let targetY = y;

    if (targetY + menuRect.height > window.innerHeight) {
      targetY = y - menuRect.height;
    }

    targetX = Math.max(VIEWPORT_OFFSET, Math.min(targetX, window.innerWidth - menuRect.width - VIEWPORT_OFFSET));
    targetY = Math.max(VIEWPORT_OFFSET, Math.min(targetY, window.innerHeight - menuRect.height - VIEWPORT_OFFSET));

    setCoords({ x: targetX, y: targetY });
    setVisible(true);
  }, [x, y, items]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="admin-context-menu"
      role="menu"
      style={{
        left: coords.x,
        top: coords.y,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} className="admin-context-menu-sep" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={item.danger ? "admin-context-menu-item admin-context-menu-item-danger" : "admin-context-menu-item"}
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? <kbd className="admin-context-menu-kbd">{item.shortcut}</kbd> : null}
          </button>
        ),
      )}
    </div>
  );
}
