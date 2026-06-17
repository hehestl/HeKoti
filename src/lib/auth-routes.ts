import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";

export async function redirectIfAuthenticated(lang: string) {
  const user = await getSessionUser();
  if (!user) return;
  redirect(isAdminRole(user.role) ? `/${lang}/admin` : `/${lang}`);
}

export async function redirectToLoginOrAdmin(lang: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/${lang}/login`);
  redirect(isAdminRole(user.role) ? `/${lang}/admin` : `/${lang}`);
}
