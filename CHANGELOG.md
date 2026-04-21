# Changelog

Краткие заметки по версиям. Перед релизом переносите пункты из **[Unreleased]** в новый блок с номером и датой, затем `npm run release:patch|minor|major` (см. `AGENTS.md`).

## [Unreleased]

### Added

- Скрипты `release:patch|minor|major`, `preversion` запускает `lint`.
- Этот файл и правило версионирования в `AGENTS.md`.

### Fixed

- ESLint `react-hooks/set-state-in-effect`: переключатель темы без `setState` в `useEffect`.

## [0.1.0] — 2026-04-22

- Базовая линия: Next.js wiki, Prisma, Docker, сиды, UI (шапка, подвал, главная).
