"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Globe, Moon, Plus, Search, Sun } from "lucide-react";
import type { AiLink } from "@/lib/ai-links";

type Option = { code: string; label: string };

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
  dict: {
    login: string;
    logout: string;
    admin: string;
    search: string;
    donate: string;
    homeAria: string;
    addPageAria: string;
    aiLinks: string;
  };
}) {
  const [query, setQuery] = useState("");
  const searchHref = useMemo(() => `/${lang}?q=${encodeURIComponent(query)}`, [lang, query]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${lang}`;
  };

  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        borderBottom: "1px solid var(--line)",
        padding: "10px 14px",
        background: "var(--panel)",
      }}
    >
      <Link
        href={`/${lang}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "inherit",
          minWidth: 0,
        }}
        aria-label={dict.homeAria}
      >
        <Image src="/hekiv.svg" alt="" width={28} height={28} aria-hidden />
        <strong>Hekoti</strong>
      </Link>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
        <Link href={`/${lang}/admin`} className="topbar-add-page-link" style={iconButtonStyle} aria-label={dict.addPageAria}>
          <Plus size={16} />
        </Link>
        <form action={searchHref} style={{ display: "flex", flex: 1, gap: 8 }}>
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.search}
          />
          <button style={iconButtonStyle} type="submit">
            <Search size={16} />
          </button>
        </form>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link href={`/${lang}/donate`} style={iconButtonStyle}>
          {dict.donate}
        </Link>
        <div style={{ position: "relative" }}>
          <Globe size={14} style={{ position: "absolute", left: 8, top: 9 }} />
          <select
            defaultValue={lang}
            onChange={(event) => (window.location.href = `/${event.target.value}`)}
            style={{ ...inputStyle, paddingLeft: 28 }}
          >
            {langs.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <ThemeToggleButton />
        {adminUser ? (
          <>
            <Link
              href={`/${lang}/admin`}
              style={{ ...iconButtonStyle, borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 600 }}
              title={adminUser.login}
            >
              {dict.admin}
            </Link>
            <button type="button" onClick={logout} style={iconButtonStyle}>
              {dict.logout}
            </button>
          </>
        ) : (
          <Link href={`/${lang}/login`} style={iconButtonStyle}>
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
  background: "transparent",
  color: "var(--fg)",
  height: 34,
  padding: "0 10px",
};

const iconButtonStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 10px",
  background: "transparent",
  color: "var(--fg)",
  cursor: "pointer",
};

/**
 * Theme can differ between SSR and client (next-themes). `suppressHydrationWarning` avoids a
 * hydration error on this node; do not use setState in an effect (eslint react-hooks/set-state-in-effect).
 */
function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      style={iconButtonStyle}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
