# Changelog

Краткие заметки по версиям. Перед релизом переносите пункты из **[Unreleased]** в новый блок с номером и датой, затем `npm run release:patch|minor|major` (см. `AGENTS.md`).

## [Unreleased]

### Changed

- Админка: три вкладки (**Посты**, **AI-агенты**, **Настройки**); активная вкладка в URL `?tab=posts|ai|settings`.
- Шапка: для залогиненного админа — **Админка** + **Выйти** вместо **Login** (сессия по-прежнему из cookie на сервере).
- Вики: колонка **Sections** подсвечивает раздел текущей страницы (первый сегмент пути), а не «All pages», когда открыта статья без `?section=`.
- Трёхколоночный макет вики без рамок и разделительных линий между колонками (единый плоский фон).
- Ширина двух левых колонок вики задаётся CSS-переменными `--repo-sidebar-labels-width` и `--repo-sidebar-pages-width` в `:root` (`globals.css`).
- На узких экранах (≤899px) в шапке скрыт выпадающий список «AI links».

### Added

- Админка → Посты: список страниц слева в виде **дерева путей** (`├──` / `└──`), порядок веток по `navOrder`; черновик ○ / опубликовано ●; промежуточный сегмент без своей статьи помечается «— нет статьи».
- В тексте статей: **`/post путь`** (после пробела, начала строки или `>` в цитате) → при показе wiki подставляется ссылка на **опубликованную** страницу; при изменении страниц сбрасывается кэш `wiki:{lang}:*`.
- Редактор Markdown в админке: **панель** и **ПКМ** — форматирование, `/post`, вики- и внешние ссылки, таблица, `<details>`, выноска, блок `$$…$$` (рендер формул отдельно не подключён).
- TOTP 2FA для админа (опционально): вкладка **Настройки** — QR + подтверждение кода; вход в два шага (`POST /api/auth/login` → при включённом 2FA `POST /api/auth/login/totp`); секрет в БД шифруется AES-256-GCM (`HEKOTI_TOTP_ENCRYPTION_KEY` или производное от `WEBHOOK_SECRET`); `POST /api/auth/totp/setup|confirm|disable`, `GET /api/auth/totp/status`.
- Макет вики как в Snibox: две левые колонки (секции / список страниц) и основная область контента на главной и на страницах wiki.
- Скрипты `release:patch|minor|major`, `preversion` запускает `lint`.
- Этот файл и правило версионирования в `AGENTS.md`.

### Added

- Дефолтный админ **admin** / **hehe**: `scripts/ensure-admin.ts` после миграций в `docker-entrypoint`; `HEKOTI_FORCE_ADMIN_RESET=1` для принудительного upsert пароля; блок **Account** в админке (`PATCH /api/admin/account`) — смена логина и пароля.
- Docker Compose: сервис `hekoti-app` в сетях `default` + внешняя `proxy-network` (для NPM и др.), тег образа `hekoti-hekoti-app`; остальные сервисы в `default`.
- `POST /api/auth/login` пишет в stdout строки `[hekoti:auth] …` (хост, `x-forwarded-proto`, результат) — удобно для `docker logs` и проверки прокси.

### Fixed

- Сессия за HTTPS reverse proxy: флаг `Secure` на cookie учитывает заголовок `X-Forwarded-Proto` (не только `APP_URL`).
- `admin-editor.tsx`: стили `panelStyle` / `buttonStyle` / `inputStyle` в начале файла + `CSSProperties` из `react` (сборка Docker/TS).
- `POST /api/auth/login`: разбор тела без строгого Zod (меньше ложных 400), явные сообщения; в форме входа — `credentials: "same-origin"` и заголовок `Content-Type`.

### Changed

- Вход в админку: пароль; при включённом TOTP — второй шаг с кодом из приложения (без лимита попыток на стороне API). Cookie `Secure` в production включается только если `APP_URL` с протоколом `https:` (или задайте `SESSION_COOKIE_INSECURE=1`). В Compose добавлен `APP_URL` по умолчанию `http://localhost:3310`.
- Docker Compose: для `hekoti-app` по умолчанию задаётся `LANGUAGETOOL_URL=http://hekoti-languagetool:8010` (можно переопределить или отключить в `.env`).

### Removed

- Плавающая кнопка Donate в правом нижнем углу (страница `/donate` и ссылка в шапке сохраняются).

### Fixed

- ESLint: каталог `snibox-master` исключён из проверки (сторонний Rails/Vue, ломал CI).
- ESLint `react-hooks/set-state-in-effect`: переключатель темы без `setState` в `useEffect`.

## [0.1.0] — 2026-04-22

- Базовая линия: Next.js wiki, Prisma, Docker, сиды, UI (шапка, подвал, главная).
