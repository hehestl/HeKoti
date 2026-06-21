"use client";

import { Search } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition, useSyncExternalStore } from "react";
import { useWikiSearchSuggestions } from "@/hooks/use-wiki-search-suggestions";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder";
import { resolveSearchNavigation } from "@/lib/search-navigation";

export type HelpCenterSearchLabels = {
  suggestionsAria: string;
  loading: string;
  noSuggestions: string;
  viewAllResults: string;
  loginHint: string;
  suggestionsError: string;
};

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function HelpCenterSearchForm({
  lang,
  placeholder,
  labels,
  initialQuery = "",
  searchSampleTitles = [],
  enableTypewriterPlaceholder = false,
}: {
  lang: string;
  placeholder: string;
  labels: HelpCenterSearchLabels;
  initialQuery?: string;
  searchSampleTitles?: string[];
  enableTypewriterPlaceholder?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listboxId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pending, startTransition] = useTransition();
  const blurTimerRef = useRef<number | null>(null);

  const typewriterEnabled =
    enableTypewriterPlaceholder && searchSampleTitles.length > 0 && !focused && query === "";

  const mounted = useMounted();
  const suggestionsEnabled = focused && open && query.trim().length > 0;

  const { items, state, loginHref } = useWikiSearchSuggestions(lang, query, suggestionsEnabled);

  const { displayText, showCaret } = useTypewriterPlaceholder({
    titles: searchSampleTitles,
    enabled: mounted && typewriterEnabled,
  });

  const showTypewriter = mounted && typewriterEnabled;
  const showDropdown = suggestionsEnabled && (loginHref || state !== "idle");

  useEffect(() => {
    setOpen(false);
    setFocused(false);
    setActiveIndex(-1);
  }, [pathname]);

  const optionCount = loginHref ? 1 : items.length;
  const showViewAll = !loginHref && items.length >= 8 && query.trim().length >= 2;

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setFocused(false);
      startTransition(() => router.push(href));
    },
    [router],
  );

  const submitSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      const loginUrl = resolveSearchNavigation(lang, trimmed);
      navigate(loginUrl ?? `/${lang}?q=${encodeURIComponent(trimmed)}`);
    },
    [lang, navigate],
  );

  const pickActive = useCallback(() => {
    if (loginHref) {
      navigate(loginHref);
      return;
    }
    if (activeIndex >= 0 && activeIndex < items.length) {
      navigate(items[activeIndex]!.href);
      return;
    }
    if (items.length > 0) {
      navigate(items[0]!.href);
      return;
    }
    submitSearch(query);
  }, [activeIndex, items, loginHref, navigate, query, submitSearch]);

  const clearBlurTimer = () => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  return (
    <form
      className="help-center-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        pickActive();
      }}
    >
      <Search size={18} strokeWidth={2} className="help-center-search-icon" aria-hidden />
      <div className="help-center-search-input-wrap">
        <input
          type="search"
          className="help-center-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            clearBlurTimer();
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimerRef.current = window.setTimeout(() => {
              setFocused(false);
              setOpen(false);
              setActiveIndex(-1);
            }, 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
              return;
            }
            if (!showDropdown || optionCount === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % optionCount);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
            }
          }}
          placeholder={showTypewriter ? "" : placeholder}
          aria-label={placeholder}
          aria-expanded={showDropdown ? true : false}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={
            showDropdown && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          disabled={pending}
        />
        {showTypewriter ? (
          <span className="help-center-search-typewriter" aria-hidden>
            <span className="help-center-search-typewriter-text">{displayText}</span>
            {showCaret ? <span className="help-center-search-typewriter-caret" /> : null}
          </span>
        ) : null}

        {showDropdown ? (
          <div className="help-center-search-suggest-panel" role="presentation">
            <ul id={listboxId} className="help-center-search-suggest-list" role="listbox" aria-label={labels.suggestionsAria}>
              {loginHref ? (
                <li
                  id={`${listboxId}-opt-0`}
                  role="option"
                  aria-selected={activeIndex === 0}
                  className={`help-center-search-suggest-item${activeIndex === 0 ? " is-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(loginHref);
                  }}
                >
                  <span className="help-center-search-suggest-title">{labels.loginHint}</span>
                </li>
              ) : null}

              {!loginHref && state === "loading" ? (
                <li className="help-center-search-suggest-status">{labels.loading}</li>
              ) : null}

              {!loginHref && state === "error" ? (
                <li className="help-center-search-suggest-status help-center-search-suggest-status-error">
                  {labels.suggestionsError}
                </li>
              ) : null}

              {!loginHref && state === "empty" ? (
                <li className="help-center-search-suggest-status">{labels.noSuggestions}</li>
              ) : null}

              {!loginHref
                ? items.map((item, index) => (
                    <li
                      key={item.id}
                      id={`${listboxId}-opt-${index}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      className={`help-center-search-suggest-item${activeIndex === index ? " is-active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigate(item.href);
                      }}
                    >
                      <span className="help-center-search-suggest-title">{item.title}</span>
                      {item.snippet ? (
                        <span className="help-center-search-suggest-snippet">{item.snippet}</span>
                      ) : null}
                    </li>
                  ))
                : null}
            </ul>

            {showViewAll ? (
              <button
                type="button"
                className="help-center-search-suggest-all"
                onMouseDown={(e) => {
                  e.preventDefault();
                  submitSearch(query);
                }}
              >
                {labels.viewAllResults}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
