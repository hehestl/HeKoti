import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export async function redirectIfAuthenticated(lang: string) {
  const user = await getSessionUser();
  if (user) redirect(`/${lang}/admin`);
}

export async function redirectToLoginOrAdmin(lang: string) {
  const user = await getSessionUser();
  redirect(user ? `/${lang}/admin` : `/${lang}/login`);
}
