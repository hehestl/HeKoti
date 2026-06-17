"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resolveSearchNavigation } from "@/lib/search-navigation";

export function HelpCenterSearchForm({
  lang,
  placeholder,
  initialQuery = "",
}: {
  lang: string;
  placeholder: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

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
      <input
        type="search"
        className="help-center-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoCorrect="off"
        disabled={pending}
      />
    </form>
  );
}
