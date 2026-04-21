"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Globe, Moon, Plus, Search, Sun } from "lucide-react";
import type { AiLink } from "@/lib/ai-links";

type Option = { code: string; label: string };

export function TopBar({
  lang,
  langs,
  ai,
}: {
  lang: string;
  langs: Option[];
  ai: AiLink[];
}) {
  const [query, setQuery] = useState("");
  const searchHref = useMemo(() => `/${lang}?q=${encodeURIComponent(query)}`, [lang, query]);
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
        aria-label="Hekoti — на главную"
      >
        <Image src="/hekiv.svg" alt="" width={28} height={28} aria-hidden />
        <strong>Hekoti</strong>
      </Link>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          style={inputStyle}
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            window.open(event.target.value, "_blank", "noopener,noreferrer");
            event.currentTarget.value = "";
          }}
        >
          <option>AI links</option>
          {ai.map((item) => (
            <option key={item.url} value={item.url}>
              {item.title}
            </option>
          ))}
        </select>
        <Link href={`/${lang}/admin`} style={iconButtonStyle} aria-label="Add page">
          <Plus size={16} />
        </Link>
        <form action={searchHref} style={{ display: "flex", flex: 1, gap: 8 }}>
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search wiki..."
          />
          <button style={iconButtonStyle} type="submit">
            <Search size={16} />
          </button>
        </form>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link href={`/${lang}/donate`} style={iconButtonStyle}>
          Donate
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
        <Link href={`/${lang}/login`} style={iconButtonStyle}>
          Login
        </Link>
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

/** Avoid hydration mismatch: `theme` from next-themes differs between server and first client paint. */
function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      style={iconButtonStyle}
      aria-label="Toggle theme"
      disabled={!mounted}
    >
      {!mounted ? <Moon size={16} /> : dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
