"use client";

import { useContext } from "react";
import { DonateInlineEditContext } from "@/components/donate-inline-edit-context";

export function useDonateInlineEditOptional() {
  return useContext(DonateInlineEditContext);
}
