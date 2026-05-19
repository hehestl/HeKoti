"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type LangOption = { code: string; label: string };

export function LanguageSwitch({
  lang,
  langs,
  groupAria,
}: {
  lang: string;
  langs: LangOption[];
  groupAria: string;
}) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.startsWith(`/${lang}`) ? pathname.slice(`/${lang}`.length) : "";

  if (langs.length === 0) return null;

  return (
    <div className="topbar-lang-group" role="group" aria-label={groupAria}>
      {langs.map((entry) => {
        const active = entry.code === lang;
        const href = `/${entry.code}${rest}`;
        return (
          <Link
            key={entry.code}
            href={href}
            className="topbar-lang-btn"
            aria-current={active ? "page" : undefined}
            title={entry.label}
            prefetch={false}
          >
            {entry.label}
          </Link>
        );
      })}
    </div>
  );
}
