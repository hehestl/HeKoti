"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

function useIsApple(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPod|iPad/i.test(navigator.platform) || navigator.userAgent.includes("Mac"),
    () => false,
  );
}

export function WikiSearchPalette({
  lang,
  searchLabel,
  paletteTitle,
  goLabel,
}: {
  lang: string;
  searchLabel: string;
  paletteTitle: string;
  goLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();
  const apple = useIsApple();
  const shortcutHint = apple ? "⌘K" : "Ctrl+K";

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const submit = useCallback(() => {
    const q = query.trim();
    close();
    if (!q) return;
    router.push(`/${lang}?q=${encodeURIComponent(q)}`);
  }, [close, lang, query, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <>
      <div className="topbar-search-cluster">
        <button
          type="button"
          className="topbar-search-pill topbar-search-pill-wide"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
        >
          <Search size={15} strokeWidth={2} className="topbar-search-pill-icon" aria-hidden />
          <span className="topbar-search-pill-placeholder">{searchLabel}</span>
          <kbd className="topbar-kbd" aria-hidden>
            {shortcutHint}
          </kbd>
        </button>
        <button
          type="button"
          className="topbar-search-pill topbar-search-pill-narrow"
          onClick={() => setOpen(true)}
          aria-label={searchLabel}
          title={searchLabel}
        >
          <Search size={20} strokeWidth={2} />
        </button>
      </div>

      {open ? (
        <div
          className="wiki-search-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal
            aria-labelledby={`${dialogId}-title`}
            className="wiki-search-dialog"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id={`${dialogId}-title`} className="wiki-search-dialog-title">
              {paletteTitle}
            </h2>
            <form
              className="wiki-search-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                ref={inputRef}
                type="search"
                className="wiki-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchLabel}
                aria-label={searchLabel}
                autoComplete="off"
                autoCorrect="off"
              />
              <button type="submit" className="wiki-search-submit">
                {goLabel}
              </button>
              <button type="button" className="wiki-search-cancel" onClick={close}>
                Esc
              </button>
            </form>
            <p className="wiki-search-hint">{shortcutHint}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
