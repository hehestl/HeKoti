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
  layout = "horizontal",
  className,
}: {
  labels: { light: string; dark: string; system: string; groupAria: string };
  layout?: "horizontal" | "vertical";
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const active: "light" | "dark" | "system" = !hydrated
    ? "system"
    : theme === "system" || !theme
      ? "system"
      : theme === "dark"
        ? "dark"
        : "light";

  const iconBtn = "topbar-theme-btn";
  const pressed = (mode: typeof active) => active === mode;

  const groupClass =
    layout === "vertical" ? "topbar-theme-group topbar-theme-group-vertical" : "topbar-theme-group";

  return (
    <div className={className ? `${groupClass} ${className}` : groupClass} role="group" aria-label={labels.groupAria}>
      <button
        type="button"
        className={iconBtn}
        aria-pressed={pressed("light")}
        title={labels.light}
        disabled={!hydrated}
        onClick={() => setTheme("light")}
      >
        <Sun size={16} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-pressed={pressed("dark")}
        title={labels.dark}
        disabled={!hydrated}
        onClick={() => setTheme("dark")}
      >
        <Moon size={16} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-pressed={pressed("system")}
        title={labels.system}
        disabled={!hydrated}
        onClick={() => setTheme("system")}
      >
        <Monitor size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
