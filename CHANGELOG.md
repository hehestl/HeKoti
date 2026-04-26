# Changelog

Краткие заметки по версиям. Перед релизом переносите пункты из **[Unreleased]** в новый блок с номером и датой, затем `npm run release:patch|minor|major` (см. `AGENTS.md`).

## [Unreleased]

### Changed

- Трёхколоночный макет вики без рамок и разделительных линий между колонками (единый плоский фон).
- Ширина двух левых колонок вики задаётся CSS-переменными `--repo-sidebar-labels-width` и `--repo-sidebar-pages-width` в `:root` (`globals.css`).
- На узких экранах (≤899px) в шапке скрыт выпадающий список «AI links».

### Added

- Макет вики как в Snibox: две левые колонки (секции / список страниц) и основная область контента на главной и на страницах wiki.
- Скрипты `release:patch|minor|major`, `preversion` запускает `lint`.
- Этот файл и правило версионирования в `AGENTS.md`.

### Fixed

- ESLint `react-hooks/set-state-in-effect`: переключатель темы без `setState` в `useEffect`.

## [0.1.0] — 2026-04-22

- Базовая линия: Next.js wiki, Prisma, Docker, сиды, UI (шапка, подвал, главная).
