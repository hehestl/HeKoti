"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildLanguageHref } from "@/lib/language-href";

type LangOption = { code: string; label: string };

function currentLabel(lang: string, langs: LangOption[]) {
  return langs.find((entry) => entry.code === lang)?.label ?? lang.toUpperCase();
}

function nextLangCode(lang: string, langs: LangOption[]) {
  if (langs.length < 2) return lang;
  const index = langs.findIndex((entry) => entry.code === lang);
  const next = index >= 0 ? (index + 1) % langs.length : 0;
  return langs[next]?.code ?? lang;
}

export function LanguageSwitchFallback({ lang, langs }: { lang: string; langs: LangOption[] }) {
  return (
    <div className="topbar-lang-switch" aria-hidden>
      <span className="topbar-lang-current">{currentLabel(lang, langs)}</span>
      <span className="topbar-lang-toggle">
        <ChevronDown size={14} strokeWidth={2} />
      </span>
    </div>
  );
}

export function LanguageSwitch({
  lang,
  langs,
  groupAria,
  pathSuffix = "",
  queryString = "",
}: {
  lang: string;
  langs: LangOption[];
  groupAria: string;
  pathSuffix?: string;
  queryString?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const hrefFor = (code: string) => buildLanguageHref(code, pathSuffix, queryString);

  useEffect(() => {
    if (langs.length === 0) return;
    for (const entry of langs) {
      if (entry.code === lang) continue;
      router.prefetch(hrefFor(entry.code));
    }
  }, [lang, langs, pathSuffix, queryString, router]);

  if (langs.length === 0) return null;

  const next = nextLangCode(lang, langs);

  return (
    <div className="topbar-lang-switch-wrap" role="group" aria-label={groupAria}>
      <div className="topbar-lang-switch">
        <Link
          href={hrefFor(next)}
          prefetch
          className="topbar-lang-current"
          title={currentLabel(next, langs)}
          onClick={() => setOpen(false)}
        >
          {currentLabel(lang, langs)}
        </Link>
        <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="topbar-lang-toggle" aria-label={groupAria}>
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="topbar-lang-menu" align="end" sideOffset={6}>
              {langs.map((entry) => (
                <DropdownMenu.Item key={entry.code} asChild onSelect={() => setOpen(false)}>
                  <Link
                    href={hrefFor(entry.code)}
                    prefetch
                    className="topbar-lang-menu-item"
                    data-active={entry.code === lang ? "" : undefined}
                  >
                    {entry.label}
                  </Link>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
