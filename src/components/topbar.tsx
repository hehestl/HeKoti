"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { WikiSearchPalette } from "@/components/wiki-search-palette";
import type { AiLink } from "@/lib/ai-links";

type Option = { code: string; label: string };

type TopBarDict = {
  login: string;
  logout: string;
  admin: string;
  search: string;
  homeAria: string;
  addPageAria: string;
  aiLinks: string;
  searchPaletteTitle: string;
  searchGo: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  themeModeAria: string;
  languageAria: string;
};

export function TopBar({
  lang,
  langs,
  ai,
  adminUser,
  dict,
}: {
  lang: string;
  langs: Option[];
  ai: AiLink[];
  /** If admin is logged in — show "Admin" and logout instead of "Login". */
  adminUser?: { login: string } | null;
  dict: TopBarDict;
}) {
  const onSwitchLang = (nextLang: string) => {
    const { pathname, search, hash } = window.location;
    const rest = pathname.startsWith(`/${lang}`) ? pathname.slice(`/${lang}`.length) : "";
    const nextPath = `/${nextLang}${rest || ""}`;
    window.location.href = `${nextPath}${search}${hash}`;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${lang}`;
  };

  return (
    <header className="topbar-shell">
      <div className="topbar-left">
        <Link href={`/${lang}`} className="topbar-brand" aria-label={dict.homeAria}>
          <span className="topbar-logo">
            <Image src="/hekoti.png" alt="" width={50} height={50} aria-hidden priority />
          </span>
          <strong className="topbar-title">Hekoti</strong>
        </Link>
      </div>

      <div className="topbar-center">
        <WikiSearchPalette
          lang={lang}
          searchLabel={dict.search}
          paletteTitle={dict.searchPaletteTitle}
          goLabel={dict.searchGo}
        />
      </div>

      <div className="topbar-right">
        <select
          className="topbar-ai-links-select"
          style={inputStyle}
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            window.open(event.target.value, "_blank", "noopener,noreferrer");
            event.currentTarget.value = "";
          }}
        >
          <option value="">{dict.aiLinks}</option>
          {ai.map((item) => (
            <option key={item.url} value={item.url}>
              {item.title}
            </option>
          ))}
        </select>
        <Link href={`/${lang}/admin`} className="topbar-add-page-link topbar-icon-link" aria-label={dict.addPageAria}>
          <Plus size={16} />
        </Link>
        <LanguageSwitch
          lang={lang}
          langs={langs}
          groupAria={dict.languageAria}
          onSwitch={onSwitchLang}
        />
        <ThemeModeToggle
          labels={{
            light: dict.themeLight,
            dark: dict.themeDark,
            system: dict.themeSystem,
            groupAria: dict.themeModeAria,
          }}
        />
        {adminUser ? (
          <>
            <Link
              href={`/${lang}/admin`}
              className="topbar-icon-link topbar-admin-link"
              title={adminUser.login}
            >
              {dict.admin}
            </Link>
            <button type="button" onClick={logout} className="topbar-icon-link">
              {dict.logout}
            </button>
          </>
        ) : (
          <Link href={`/${lang}/login`} className="topbar-icon-link">
            {dict.login}
          </Link>
        )}
      </div>
    </header>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  background: "var(--panel)",
  color: "var(--fg)",
  height: 34,
  padding: "0 10px",
};
