"use client";

import { useEffect, useRef, useState } from "react";
import { resolveSearchNavigation } from "@/lib/search-navigation";

export type WikiSearchSuggestion = {
  id: string;
  title: string;
  path: string;
  href: string;
  snippet: string;
};

export type WikiSearchSuggestionState = "idle" | "loading" | "ready" | "error" | "empty";

export function useWikiSearchSuggestions(lang: string, query: string, enabled: boolean) {
  const [items, setItems] = useState<WikiSearchSuggestion[]>([]);
  const [state, setState] = useState<WikiSearchSuggestionState>("idle");
  const [loginHref, setLoginHref] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoginHref(null);
      setState("idle");
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setLoginHref(null);
      setState("idle");
      return;
    }

    const loginUrl = resolveSearchNavigation(lang, trimmed);
    if (loginUrl) {
      setLoginHref(loginUrl);
      setItems([]);
      setState("ready");
      return;
    }

    setLoginHref(null);

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
            `/api/wiki/search?lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(trimmed)}&limit=8`,
            { signal: controller.signal },
          );
          if (requestId !== requestIdRef.current) return;

          if (!res.ok) {
            setItems([]);
            setState("error");
            return;
          }

          const data = (await res.json()) as { items: WikiSearchSuggestion[] };
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
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lang, query, enabled]);

  return { items, state, loginHref };
}
