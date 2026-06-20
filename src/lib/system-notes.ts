import { prisma } from "@/lib/db";
import { notesPageWhere } from "@/lib/page-query";
import { normalizePath } from "@/lib/slug";

export const SYSTEM_NOTE_KEYS = ["hekoti-welcome", "hekoti-support"] as const;
export type SystemNoteKey = (typeof SYSTEM_NOTE_KEYS)[number];

const SYSTEM_NOTE_SLUGS: Record<SystemNoteKey, string> = {
  "hekoti-welcome": "hekoti-welcome",
  "hekoti-support": "hekoti-support",
};

function welcomeMarkdown(lang: string): { title: string; contentMd: string } {
  if (lang === "ru") {
    return {
      title: "Добро пожаловать в Hekoti",
      contentMd: `# Добро пожаловать в Hekoti

Мы — команда, создавшая **Hekoti**: небольшую self-hosted вики для ваших знаний.

## Возможности

- **Мультиязычность** — страницы на нескольких языках, переключение в вики
- **Monaco-редактор** — удобное редактирование Markdown в админке
- **AI-агенты** — помощь в написании, переводе и исследовании
- **Architecture** — синхронизация структуры из markdown-дерева
- **Slug и редиректы** — переименование URL с 7-дневным редиректом
- **Реакции** — обратная связь на опубликованных страницах
- **Webhooks** — интеграция с внешними системами
- **TOTP** — двухфакторная аутентификация для админов

## Заметки

Этот раздел — **внутренний черновик**. Заметки не публикуются в вики и видны только администраторам.

Отредактируйте этот текст под свой проект.`,
    };
  }
  return {
    title: "Welcome to Hekoti",
    contentMd: `# Welcome to Hekoti

We built **Hekoti** — a small self-hosted knowledge wiki for your team.

## Features

- **Multilingual** — pages in several languages with a language switcher
- **Monaco editor** — comfortable Markdown editing in the admin panel
- **AI agents** — help with writing, translation, and research
- **Architecture** — sync wiki structure from a markdown tree
- **Slug redirects** — rename URLs with 7-day temporary redirects
- **Reactions** — feedback on published pages
- **Webhooks** — integrate with external systems
- **TOTP** — two-factor authentication for admins

## Notes

This section is an **internal draft space**. Notes are never published to the wiki and are visible to admins only.

Edit this text to match your deployment.`,
  };
}

function supportMarkdown(lang: string): { title: string; contentMd: string } {
  if (lang === "ru") {
    return {
      title: "Поддержать проект",
      contentMd: `# Поддержать Hekoti

Если вам понравился наш продукт, рассмотрите возможность **поддержать разработку**.

## Криптовалюта

Адреса кошельков настраиваются через переменную окружения \`CRYPTO_DONATION_JSON\`.
Публичная страница доната: \`/{lang}/donate\`.

Пример формата:

\`\`\`json
[{"asset":"BTC","network":"Bitcoin","address":"bc1..."}]
\`\`\`

## Другие способы

Ссылки на платформы — через \`DONATE_LINKS_JSON\`.

Спасибо за поддержку!`,
    };
  }
  return {
    title: "Support the project",
    contentMd: `# Support Hekoti

If you enjoy our product, please consider **supporting development**.

## Cryptocurrency

Wallet addresses are configured via the \`CRYPTO_DONATION_JSON\` environment variable.
Public donate page: \`/{lang}/donate\`.

Example format:

\`\`\`json
[{"asset":"BTC","network":"Bitcoin","address":"bc1..."}]
\`\`\`

## Other platforms

Donation links use \`DONATE_LINKS_JSON\`.

Thank you for your support!`,
  };
}

const CONTENT_BY_KEY: Record<SystemNoteKey, (lang: string) => { title: string; contentMd: string }> = {
  "hekoti-welcome": welcomeMarkdown,
  "hekoti-support": supportMarkdown,
};

async function ensureOneSystemNote(lang: string, systemKey: SystemNoteKey) {
  const existing = await prisma.page.findFirst({
    where: { lang, systemKey, ...notesPageWhere },
  });
  if (existing) return existing;

  const slug = SYSTEM_NOTE_SLUGS[systemKey];
  const { title, contentMd } = CONTENT_BY_KEY[systemKey](lang);
  const path = normalizePath(lang, ["notes", slug]);

  return prisma.page.create({
    data: {
      title,
      slug,
      lang,
      path,
      contentMd,
      scope: "NOTES",
      systemKey,
      isPublished: false,
      navOrder: systemKey === "hekoti-welcome" ? 10 : 20,
    },
  });
}

/** Idempotent bootstrap of protected system notes for a language. */
export async function ensureSystemNotes(lang: string) {
  for (const key of SYSTEM_NOTE_KEYS) {
    await ensureOneSystemNote(lang, key);
  }
}
