"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Globe, Moon, Plus, Search, Sun } from "lucide-react";
import { useMemo } from "react";
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
  const { theme, setTheme } = useTheme();
  const [logoSrc, setLogoSrc] = useState("/hekiv.png");
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image
          key={logoSrc}
          src={logoSrc}
          alt="Hekoti mascot"
          width={28}
          height={28}
          onError={() => setLogoSrc("/hekiv.svg")}
        />
        <strong>Hekoti</strong>
      </div>
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
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={iconButtonStyle}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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
