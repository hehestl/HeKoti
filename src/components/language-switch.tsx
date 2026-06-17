"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type LangOption = { code: string; label: string };

function useLangHref(lang: string) {
  const pathname = usePathname() ?? `/${lang}`;
  const searchParams = useSearchParams();
  const rest = pathname.startsWith(`/${lang}`) ? pathname.slice(`/${lang}`.length) : "";
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";

  return (code: string) => `/${code}${rest}${suffix}`;
}

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
}: {
  lang: string;
  langs: LangOption[];
  groupAria: string;
}) {
  const hrefFor = useLangHref(lang);

  if (langs.length === 0) return null;

  const next = nextLangCode(lang, langs);

  return (
    <div className="topbar-lang-switch-wrap" role="group" aria-label={groupAria}>
      <div className="topbar-lang-switch">
        <Link
          href={hrefFor(next)}
          className="topbar-lang-current"
          title={currentLabel(next, langs)}
          prefetch={false}
        >
          {currentLabel(lang, langs)}
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="topbar-lang-toggle" aria-label={groupAria}>
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="topbar-lang-menu" align="end" sideOffset={6}>
              {langs.map((entry) => (
                <DropdownMenu.Item key={entry.code} asChild>
                  <Link
                    href={hrefFor(entry.code)}
                    className="topbar-lang-menu-item"
                    data-active={entry.code === lang ? "" : undefined}
                    prefetch={false}
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
