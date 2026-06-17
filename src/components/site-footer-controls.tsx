"use client";

import { ThemeModeToggle } from "@/components/theme-mode-toggle";

export function SiteFooterControls({
  labels,
}: {
  labels: {
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    themeModeAria: string;
  };
}) {
  return (
    <div className="site-footer-controls">
      <ThemeModeToggle
        labels={{
          light: labels.themeLight,
          dark: labels.themeDark,
          system: labels.themeSystem,
          groupAria: labels.themeModeAria,
        }}
      />
    </div>
  );
}
