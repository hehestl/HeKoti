"use server";

import { redirect } from "next/navigation";
import { logoutAdmin } from "@/lib/auth";

export async function logoutAction(lang: string) {
  await logoutAdmin();
  redirect(`/${lang}`);
}
