"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
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
  if (langs.length === 0) return null;

  const hrefFor = (code: string) => buildLanguageHref(code, pathSuffix, queryString);
  const next = nextLangCode(lang, langs);

  return (
    <div className="topbar-lang-switch-wrap" role="group" aria-label={groupAria}>
      <div className="topbar-lang-switch">
        <a href={hrefFor(next)} className="topbar-lang-current" title={currentLabel(next, langs)}>
          {currentLabel(lang, langs)}
        </a>
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="topbar-lang-toggle" aria-label={groupAria}>
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="topbar-lang-menu" align="end" sideOffset={6}>
              {langs.map((entry) => (
                <DropdownMenu.Item key={entry.code} asChild>
                  <a
                    href={hrefFor(entry.code)}
                    className="topbar-lang-menu-item"
                    data-active={entry.code === lang ? "" : undefined}
                  >
                    {entry.label}
                  </a>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
