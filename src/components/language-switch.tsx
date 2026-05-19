"use client";

type LangOption = { code: string; label: string };

export function LanguageSwitch({
  lang,
  langs,
  groupAria,
  onSwitch,
}: {
  lang: string;
  langs: LangOption[];
  groupAria: string;
  onSwitch: (code: string) => void;
}) {
  if (langs.length === 0) return null;

  return (
    <div className="topbar-lang-group" role="group" aria-label={groupAria}>
      {langs.map((entry) => {
        const active = entry.code === lang;
        return (
          <button
            key={entry.code}
            type="button"
            className="topbar-lang-btn"
            aria-pressed={active}
            title={entry.label}
            onClick={() => {
              if (!active) onSwitch(entry.code);
            }}
          >
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}
