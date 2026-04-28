import { redirect } from "next/navigation";
import { getDefaultLanguage } from "@/lib/i18n";

export default async function Home() {
  const lang = await getDefaultLanguage();
  redirect(`/${lang}`);
}
