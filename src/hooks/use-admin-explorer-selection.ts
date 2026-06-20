"use client";

import { useCallback, useRef, useState } from "react";
import type { AdminPageRow } from "@/types/admin-workbench";
import {
  explorerSelectionKey,
  selectRangeKeys,
} from "@/lib/admin-explorer-selection";

export function useAdminExplorerSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const anchorRef = useRef<string | null>(null);

  const isSelected = useCallback(
    (lang: string, pageId: string) => selected.has(explorerSelectionKey(lang, pageId)),
    [selected],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    anchorRef.current = null;
  }, []);

  const handleRowClick = useCallback(
    (
      page: AdminPageRow,
      e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
      visiblePages: AdminPageRow[],
    ): { openTab: boolean } => {
      const key = explorerSelectionKey(page.lang, page.id);
      const mod = e.metaKey || e.ctrlKey;

      if (e.shiftKey && anchorRef.current) {
        setSelected(selectRangeKeys(visiblePages, anchorRef.current, key));
        return { openTab: false };
      }

      if (mod) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
        anchorRef.current = key;
        return { openTab: false };
      }

      setSelected(new Set([key]));
      anchorRef.current = key;
      return { openTab: true };
    },
    [],
  );

  const selectSingle = useCallback((page: AdminPageRow) => {
    const key = explorerSelectionKey(page.lang, page.id);
    setSelected(new Set([key]));
    anchorRef.current = key;
  }, []);

  return {
    selected,
    selectedCount: selected.size,
    isSelected,
    clearSelection,
    handleRowClick,
    selectSingle,
  };
}
