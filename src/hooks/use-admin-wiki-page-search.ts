"use client";

import { useEffect, useRef, useState } from "react";

export type AdminWikiPageSearchItem = {
  id: string;
  title: string;
  path: string;
  pathTail: string;
  href: string;
  snippet: string;
  isPublished: boolean;
};

export type AdminWikiPageSearchState = "idle" | "loading" | "ready" | "error" | "empty";

export function useAdminWikiPageSearch(lang: string, query: string, enabled: boolean) {
  const [items, setItems] = useState<AdminWikiPageSearchItem[]>([]);
  const [state, setState] = useState<AdminWikiPageSearchState>("idle");
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setState("idle");
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setItems([]);
      setState("idle");
      return;
    }

    const requestId = ++requestIdRef.current;
    setState("loading");
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/pages/search?lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(trimmed)}&limit=12`,
            { signal: controller.signal },
          );
          if (requestId !== requestIdRef.current) return;

          if (!res.ok) {
            setItems([]);
            setState("error");
            return;
          }

          const data = (await res.json()) as { items: AdminWikiPageSearchItem[] };
          const next = data.items ?? [];
          setItems(next);
          setState(next.length > 0 ? "ready" : "empty");
        } catch (err) {
          if (requestId !== requestIdRef.current) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setItems([]);
          setState("error");
        }
      })();
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lang, query, enabled]);

  return { items, state };
}
