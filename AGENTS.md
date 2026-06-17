# AGENTS — Hekoti

Агент Cursor **обязан** следовать правилам в [`.cursor/rules/`](.cursor/rules/).

| Файл | Назначение |
|------|------------|
| `00-hekoti.mdc` | Всегда включено (`alwaysApply: true`) |
| `00global.md` | Глобальные приоритеты и формат работы |
| `glossary.md` | Имена доменов (Loka, Hemonea, Hefest и др.) |
| `architecture.md` | Архитектура и слои |
| `postgres.md` | PostgreSQL, миграции |
| `telegram.md` | Telegram-боты |
| `testing.md` | Тестирование |

Папка `.cursor/` в `.gitignore` и `.dockerignore` — **не коммитить** и **не попадать в Docker-образ** (только локальные правила и сессия Cursor). При необходимости скопируйте правила из `hehe-ecosystem/.cursor/rules/`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Versioning

- Каноническая версия приложения — файл **`VERSION`** в корне (одна строка SemVer).
- `package.json.version` — для npm и зависимостей; при `npm run release:*` обновляется вместе с `VERSION` через `postversion`.
- UI: админка → Tech → `getAppVersion()` из `src/lib/version.ts`.
- **Changelog:** правки в `CHANGELOG.md` → `[Unreleased]`; одна строка на изменение (`Модуль: суть`).
- **Релиз:** перенести `[Unreleased]` в `## [x.y.z] — YYYY-MM-DD`, затем:
  - `npm run release:patch` | `release:minor` | `release:major`
  - или `npm run release` (= patch)
- `preversion` → `npm run lint`; коммит: `chore(release): x.y.z`.
