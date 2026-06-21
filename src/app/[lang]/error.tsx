"use client";

import { usePathname } from "next/navigation";
import { WikiErrorView } from "@/components/wiki-error-view";

const KNOWN_LANGS = ["en", "ru"] as const;

function langFromPathname(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "en";
  return (KNOWN_LANGS as readonly string[]).includes(segment) ? segment : "en";
}

const LABELS: Record<string, { title: string; desc: string; retry: string; backHome: string }> = {
  en: {
    title: "Something went wrong",
    desc: "An unexpected error occurred. You can try again or return home.",
    retry: "Try again",
    backHome: "Back to home",
  },
  ru: {
    title: "Что-то пошло не так",
    desc: "Произошла непредвиденная ошибка. Можно повторить попытку или вернуться на главную.",
    retry: "Повторить",
    backHome: "На главную",
  },
};

function labelsFor(lang: string) {
  return LABELS[lang] ?? LABELS.en!;
}

export default function LangError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname() ?? "/en";
  const lang = langFromPathname(pathname);
  const labels = labelsFor(lang);

  return (
    <WikiErrorView
      lang={lang}
      title={labels.title}
      description={labels.desc}
      backHomeLabel={labels.backHome}
      backHomeHref={`/${lang}`}
      retryLabel={labels.retry}
      onRetry={reset}
    />
  );
}
