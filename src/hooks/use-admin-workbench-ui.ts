"use client";

import { useCallback, useEffect, useState } from "react";

const SPLIT_KEY = "admin-split-ratio";
const PREVIEW_KEY = "admin-preview-visible";

export function useAdminWorkbenchUi() {
  const [previewVisible, setPreviewVisible] = useState(true);
  const [splitRatio, setSplitRatio] = useState(0.55);

  useEffect(() => {
    try {
      const ratio = localStorage.getItem(SPLIT_KEY);
      if (ratio) {
        const n = Number(ratio);
        if (n >= 0.35 && n <= 0.85) setSplitRatio(n);
      }
      const vis = localStorage.getItem(PREVIEW_KEY);
      if (vis === "0") setPreviewVisible(false);
    } catch {
      /* ignore */
    }
  }, []);

  const togglePreview = useCallback(() => {
    setPreviewVisible((prev) => {
      const next = !prev;
      localStorage.setItem(PREVIEW_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const updateSplitRatio = useCallback((ratio: number) => {
    const clamped = Math.min(0.85, Math.max(0.35, ratio));
    setSplitRatio(clamped);
    localStorage.setItem(SPLIT_KEY, String(clamped));
  }, []);

  return { previewVisible, splitRatio, togglePreview, updateSplitRatio };
}
