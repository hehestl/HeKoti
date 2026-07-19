"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_MASCOT_ID, resolveMascotSrc } from "@/lib/mascots";

const MascotContext = createContext(resolveMascotSrc(DEFAULT_MASCOT_ID));

export function MascotProvider({ src, children }: { src: string; children: ReactNode }) {
  return <MascotContext.Provider value={src}>{children}</MascotContext.Provider>;
}

export function useMascotSrc(): string {
  return useContext(MascotContext);
}
