import {
  Book,
  Code,
  Coins,
  FileText,
  Folder,
  Hammer,
  HelpCircle,
  Layers,
  Radio,
  Settings,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const WIKI_ICON_PRESETS = {
  folder: Folder,
  file: FileText,
  book: Book,
  code: Code,
  coins: Coins,
  shield: Shield,
  help: HelpCircle,
  layers: Layers,
  settings: Settings,
  radio: Radio,
  hammer: Hammer,
} as const;

export type WikiIconKey = keyof typeof WIKI_ICON_PRESETS;

const ICON_KEYS = new Set<string>(Object.keys(WIKI_ICON_PRESETS));

export function isWikiIconKey(value: string): value is WikiIconKey {
  return ICON_KEYS.has(value);
}

export function resolveWikiIconComponent(icon: string | null | undefined, isCategory: boolean): LucideIcon {
  if (icon && isWikiIconKey(icon)) return WIKI_ICON_PRESETS[icon];
  if (isCategory) return Folder;
  return FileText;
}
