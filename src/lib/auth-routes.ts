import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { buildAuthLoginPath } from "@/lib/heron-auth-client";
import { isAdminRole } from "@/lib/user-role";

export function isHeronSsoEnabled(): boolean {
  return env.HEKOTI_HERON_AUTH_ENABLED === "1";
}

/** Heron auto-login when SSO enabled, otherwise /{lang}/login. */
export function redirectToLogin(
  lang: string,
  returnTo: string,
  opts?: { allowLocal?: boolean },
): never {
  if (isHeronSsoEnabled() && !opts?.allowLocal) {
    redirect(buildAuthLoginPath(returnTo, true));
  }
  redirect(`/${lang}/login`);
}

export async function redirectIfAuthenticated(lang: string) {
  const user = await getSessionUser();
  if (!user) return;
  redirect(isAdminRole(user.role) ? `/${lang}/admin` : `/${lang}`);
}

export async function redirectToLoginOrAdmin(lang: string) {
  const user = await getSessionUser();
  if (!user) redirectToLogin(lang, `/${lang}/admin`);
  redirect(isAdminRole(user.role) ? `/${lang}/admin` : `/${lang}`);
}
