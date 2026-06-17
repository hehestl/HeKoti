import { redirectToLoginOrAdmin } from "@/lib/auth-routes";
import { safeLang } from "@/lib/i18n";

export default async function LoginAliasPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  await redirectToLoginOrAdmin(safeLang(inputLang));
}
