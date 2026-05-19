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

- **Changelog:** правьте `CHANGELOG.md`: новые изменения — в раздел `[Unreleased]` (короткие буллеты: Added / Fixed / Changed).
- **Релиз:** перед `npm run release:*` перенесите пункты из `[Unreleased]` в новый заголовок `## [x.y.z] — YYYY-MM-DD`, затем:
  - `npm run release:patch` — патч (0.1.0 → 0.1.1),
  - `npm run release:minor` — минор (0.1.0 → 0.2.0),
  - `npm run release:major` — мажор (0.1.0 → 1.0.0).
- `preversion` выполняет `npm run lint`; при необходимости добавьте в него `build` локально (не обязательно в CI для каждого патча).
- Коммит сообщения от `npm version`: `chore(release): x.y.z`.
