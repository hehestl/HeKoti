import type { LucideIcon } from "lucide-react";
import { resolveWikiIconComponent, type WikiIconKey } from "@/lib/wiki-icon-presets";

export type PageIconSource = {
  icon?: string | null;
  isCategory?: boolean;
};

export function resolvePageIcon(page: PageIconSource): LucideIcon {
  return resolveWikiIconComponent(page.icon, page.isCategory === true);
}

export type { WikiIconKey };
