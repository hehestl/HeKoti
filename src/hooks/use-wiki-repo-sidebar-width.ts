"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wiki-repo-sidebar-width";
const DEFAULT_WIDTH = 288;
const MIN_WIDTH = 200;
const MAX_WIDTH = 520;

export function useWikiRepoSidebarWidth() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const n = Number(raw);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) setWidth(n);
    } catch {
      /* ignore */
    }
  }, []);

  const updateWidth = useCallback((next: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(next)));
    setWidth(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  return { width, updateWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };
}
