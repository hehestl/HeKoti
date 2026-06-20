"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useSyncExternalStore } from "react";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter-placeholder";
import { resolveSearchNavigation } from "@/lib/search-navigation";

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
  initialQuery = "",
  searchSampleTitles = [],
  enableTypewriterPlaceholder = false,
}: {
  lang: string;
  placeholder: string;
  initialQuery?: string;
  searchSampleTitles?: string[];
  enableTypewriterPlaceholder?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [pending, startTransition] = useTransition();

  const typewriterEnabled =
    enableTypewriterPlaceholder && searchSampleTitles.length > 0 && !focused && query === "";

  const mounted = useMounted();

  const { displayText, showCaret } = useTypewriterPlaceholder({
    titles: searchSampleTitles,
    enabled: mounted && typewriterEnabled,
  });

  const showTypewriter = mounted && typewriterEnabled;

  return (
    <form
      className="help-center-search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        const loginUrl = resolveSearchNavigation(lang, q);
        startTransition(() => {
          router.push(loginUrl ?? `/${lang}?q=${encodeURIComponent(q)}`);
        });
      }}
    >
      <Search size={18} strokeWidth={2} className="help-center-search-icon" aria-hidden />
      <div className="help-center-search-input-wrap">
        <input
          type="search"
          className="help-center-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={showTypewriter ? "" : placeholder}
          aria-label={placeholder}
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
      </div>
    </form>
  );
}
