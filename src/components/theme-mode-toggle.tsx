"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeModeToggle({
  labels,
}: {
  labels: { light: string; dark: string; system: string; groupAria: string };
}) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div
        className="topbar-theme-group"
        style={{ minWidth: 108, minHeight: 34, borderRadius: 10, border: "1px solid var(--line)" }}
        aria-hidden
      />
    );
  }

  const active: "light" | "dark" | "system" =
    theme === "system" || !theme ? "system" : theme === "dark" ? "dark" : "light";

  const iconBtn = "topbar-theme-btn";
  const pressed = (mode: typeof active) => active === mode;

  return (
    <div className="topbar-theme-group" role="group" aria-label={labels.groupAria}>
      <button
        type="button"
        className={iconBtn}
        aria-pressed={pressed("light")}
        title={labels.light}
        onClick={() => setTheme("light")}
      >
        <Sun size={16} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-pressed={pressed("dark")}
        title={labels.dark}
        onClick={() => setTheme("dark")}
      >
        <Moon size={16} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-pressed={pressed("system")}
        title={labels.system}
        onClick={() => setTheme("system")}
      >
        <Monitor size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
