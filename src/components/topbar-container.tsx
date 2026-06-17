"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "@/components/topbar";
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

export function TopBarContainer({
  lang,
  langs,
  ai,
  adminUser,
  dict,
}: {
  lang: string;
  langs: LangOption[];
  ai: AiLink[];
  adminUser?: { login: string } | null;
  dict: TopBarDict;
}) {
  const pathname = usePathname() ?? "";
  const homePath = `/${lang}`;
  const isHelpCenterHome = pathname === homePath || pathname === `${homePath}/`;

  return (
    <TopBar
      lang={lang}
      langs={langs}
      ai={ai}
      adminUser={adminUser}
      dict={dict}
      variant={isHelpCenterHome ? "help-center" : "default"}
    />
  );
}
