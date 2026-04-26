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

- Сессия за HTTPS reverse proxy: флаг `Secure` на cookie учитывает заголовок `X-Forwarded-Proto` (не только `APP_URL`).
- `admin-editor.tsx`: стили `panelStyle` / `buttonStyle` / `inputStyle` в начале файла + `CSSProperties` из `react` (сборка Docker/TS).
- `POST /api/auth/login`: разбор тела без строгого Zod (меньше ложных 400), явные сообщения; в форме входа — `credentials: "same-origin"` и заголовок `Content-Type`.

### Changed

- Вход в админку: только email и пароль (без TOTP и без лимита попыток). Cookie `Secure` в production включается только если `APP_URL` с протоколом `https:` (или задайте `SESSION_COOKIE_INSECURE=1`). В Compose добавлен `APP_URL` по умолчанию `http://localhost:3310`.
- Docker Compose: для `hekoti-app` по умолчанию задаётся `LANGUAGETOOL_URL=http://hekoti-languagetool:8010` (можно переопределить или отключить в `.env`).

### Removed

- Плавающая кнопка Donate в правом нижнем углу (страница `/donate` и ссылка в шапке сохраняются).

### Fixed

- ESLint: каталог `snibox-master` исключён из проверки (сторонний Rails/Vue, ломал CI).
- ESLint `react-hooks/set-state-in-effect`: переключатель темы без `setState` в `useEffect`.

## [0.1.0] — 2026-04-22

- Базовая линия: Next.js wiki, Prisma, Docker, сиды, UI (шапка, подвал, главная).
