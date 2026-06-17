"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LanguageSwitch } from "@/components/language-switch";
import { WikiSearchPalette } from "@/components/wiki-search-palette";
import type { AiLink } from "@/lib/ai-links";

type LangOption = { code: string; label: string };

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
  languageAria: string;
};

export function TopBar({
  lang,
  langs,
  ai,
  adminUser,
  dict,
  variant = "default",
}: {
  lang: string;
  langs: LangOption[];
  ai: AiLink[];
  adminUser?: { login: string } | null;
  dict: TopBarDict;
  variant?: "default" | "help-center";
}) {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${lang}`;
  };

  const shellClass =
    variant === "help-center" ? "topbar-shell topbar-shell--help-center" : "topbar-shell";

  return (
    <header className={shellClass}>
      <div className="topbar-left">
        {variant !== "help-center" ? (
          <Link href={`/${lang}`} className="topbar-brand" aria-label={dict.homeAria}>
            <span className="topbar-logo">
              <Image src="/hekoti.png" alt="" width={50} height={50} aria-hidden priority />
            </span>
            <strong className="topbar-title">Hekoti</strong>
          </Link>
        ) : null}
      </div>

      <div className="topbar-center">
        {variant !== "help-center" ? (
          <WikiSearchPalette
            lang={lang}
            searchLabel={dict.search}
            paletteTitle={dict.searchPaletteTitle}
            goLabel={dict.searchGo}
          />
        ) : null}
      </div>

      <div className="topbar-right">
        <LanguageSwitch lang={lang} langs={langs} groupAria={dict.languageAria} />
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
