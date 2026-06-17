# Changelog

Все изменения Hekoti.  
Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/), упрощённый.

Правило: **одна строка = одно изменение**; начинать с модуля/области.  
Пример: `- Admin: версия приложения из файла VERSION`

Перед релизом: перенести `[Unreleased]` → `## [x.y.z] — YYYY-MM-DD`, затем `npm run release:*`.

## [Unreleased]
### Security

- **CSRF защита**: добавлен middleware с HMAC-based double-submit cookie pattern для всех state-changing запросов (POST/PUT/PATCH/DELETE)
- **Безопасность заголовков**: добавлены заголовки X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Referrer-Policy, Permissions-Policy
- **Валидация email**: строгая валидация формата email (RFC 5322) при входе и смене логина
- **Безопасность загрузки файлов**: проверка MIME типов, ограничение размера 10MB, валидация расширений, защита от path traversal
- **Rate limiting**: добавлено ограничение на TOTP попытки (25 за 5 минут по IP)
- **Валидация webhook**: добавлена проверка размера payload (1MB) и строгая валидация схемы Zod
- **Улучшена валидация паролей**: минимальная длина 8 символов, требование букв и цифр
- **CSP ужесточен**: удалено 'unsafe-eval', добавлены object-src 'none', form-action 'self', upgrade-insecure-requests
- **Минимизация ошибок**: в production не раскрываются детали ошибок БД в health check
- **Защита от timing attacks**: добавлена задержка ответа при входе (200ms минимум)
- **Audit логирование**: добавлена система логирования всех важных событий (вход, смена пароля, загрузка файлов, создание страниц)
- **Улучшена обработка ошибок**: централизованный error handler с категоризацией и логированием
- **Валидация Content-Type**: проверка заголовков Content-Type для всех API endpoints
- **DoS защита**: ограничение размера запросов (1MB JSON, 10MB файлы), ограничение глубины JSON (100 уровней)
- **Безопасность сессий**: добавлено абсолютное время жизни сессии (30 дней), автоматическое продление при активности
- **Улучшена валидация HTML**: блокировка javascript:, data:, vbscript: URI, проверка на опасные паттерны
- **Автоматическое сканирование**: добавлен GitHub workflow для npm audit и проверки зависимостей
- **Тесты безопасности**: добавлены тесты для email валидации, webhook подписей, TOTP, CSRF токенов
- **Документация безопасности**: добавлен docs/SECURITY.ru.md с описанием мер безопасности и рекомендациями

### Fixed

- **CI typecheck**: `prisma generate` перед `tsc` в Security workflow (`npm ci --ignore-scripts` не генерировал клиент).
- **Зависимости (npm audit)**: `next` 16.2.6, `sanitize-html` 2.17.4, overrides для `hono`, `@hono/node-server`, `fast-uri`, `dompurify`, `postcss`; CI `npm audit fix --dry-run` снова проходит.
- **CSP / клиентский JS**: `script-src` с `'unsafe-inline'` вместо nonce (совместимость с Next.js); блокировка `<meta http-equiv="Content-Security-Policy">` в телеметрии; prefetch исключён из middleware matcher.
- **Языки**: переключатель на `<Link>` — работает даже при частичной загрузке JS.
- **Шапка**: кнопки языков и переключатель темы всегда видны (вторая строка на узком экране, горизонтальный скролл при многих языках).

### Changed

- **Help Center UX**: новая главная с маскотом, центральным поиском и карточками тем; публичная навигация «тема → ветка → статья» без sidebar; страницы коллекций для промежуточных URL; переключатель языка в topbar (в footer — только тема).
- **AGENTS.md**: обязательные правила из `.cursor/rules/`; `.cursor` явно исключён из git и Docker build context.
- Вики: одна колонка навигации — **сворачиваемое дерево** опубликованных страниц (режим поиска `q` по-прежнему даёт плоский список); колонка «Разделы» убрана.
- Админ (посты): левое дерево в стиле Docmost — chevron, меню действий по строке, иконки **Eye/EyeOff** для черновика/публикации, шапка **Pages** с кнопкой «Новая страница».
- Вики: колонки **Разделы** и **Страницы** — видимая область ~20 строк, дальше внутренний скролл с тонким скроллбаром (`globals.css`).
- Админка: три вкладки (**Посты**, **AI-агенты**, **Настройки**); активная вкладка в URL `?tab=posts|ai|settings`.
- Шапка: для залогиненного админа — **Админка** + **Выйти** вместо **Login** (сессия по-прежнему из cookie на сервере).
- Двухколоночный макет вики (сайдбар + контент) без рамок между колонками (единый плоский фон).
- Ширина сайдбара вики задаётся `--repo-sidebar-width` в `:root` (`globals.css`).
- На узких экранах (≤899px) в шапке скрыт выпадающий список «AI links».
- Ссылка **Donate** вынесена из шапки в подвал (рядом с GitHub, поддержкой и т.д.).

### Added

- Favicon / Apple touch: SVG в `public/` (`fav-wiki16`–`512`, `fav-wiki180`) подключены через `metadata.icons` в корневом layout.
- Шапка: **поиск-пилюля** по центру (как в Docmost), глобально **Ctrl+K / ⌘K** открывает палитру поиска и переход на главную с `?q=`; переключатель темы **светлая / тёмная / как в системе** (вместо одной кнопки).
- Текстовый баннер HeKoti при установке зависимостей (`npm` `postinstall`: `scripts/install-banner.cjs`, без шума в CI / при `SKIP_HEKOTI_BANNER=1`) и при старте контейнера (`docker-entrypoint.sh`: `--startup`).
- README: схема стека Docker Compose в Mermaid; автообновление маркеров `COMPOSE_MERMAID_AUTO_*` через `scripts/update_compose_mermaid_readme.py` и workflow `.github/workflows/compose-mermaid.yml` (образ `derlin/docker-compose-viz-mermaid`).
- Миграция `0004_global_settings`: таблица `GlobalSettings` (если ещё не создавалась через `db push`).
- Перед `prisma migrate deploy` в Docker: `scripts/check-prisma-migrations-destructive.cjs` — стоп при `DROP DATABASE/SCHEMA/TABLE/TYPE` или `TRUNCATE` без `HEKOTI_MIGRATE_ALLOW_DESTRUCTIVE=1`; `HEKOTI_SKIP_DESTRUCTIVE_MIGRATION_CHECK=1` отключает проверку.
- Админка → **Настройки**: блок телеметрии (HTML «терминал») — крупные поля + шаблоны Яндекс.Метрики и Google Analytics (gtag).

- Админка → Посты: список страниц слева в виде **дерева путей** (`├──` / `└──`), порядок веток по `navOrder`; черновик ○ / опубликовано ●; промежуточный сегмент без своей статьи помечается «— нет статьи».
- В тексте статей: **`/post путь`** (после пробела, начала строки или `>` в цитате) → при показе wiki подставляется ссылка на **опубликованную** страницу; при изменении страниц сбрасывается кэш `wiki:{lang}:*`.
- Редактор Markdown в админке: **панель** и **ПКМ** — форматирование, `/post`, вики- и внешние ссылки, таблица, `<details>`, выноска, блок `$$…$$` (рендер формул отдельно не подключён).
- TOTP 2FA для админа (опционально): вкладка **Настройки** — QR + подтверждение кода; вход в два шага (`POST /api/auth/login` → при включённом 2FA `POST /api/auth/login/totp`); секрет в БД шифруется AES-256-GCM (`HEKOTI_TOTP_ENCRYPTION_KEY` или производное от `WEBHOOK_SECRET`); `POST /api/auth/totp/setup|confirm|disable`, `GET /api/auth/totp/status`.
- Макет вики как в Snibox: две левые колонки (секции / список страниц) и основная область контента на главной и на страницах wiki.
- Скрипты `release:patch|minor|major`, `preversion` запускает `lint`.
- Этот файл и правило версионирования в `AGENTS.md`.
- Дефолтный админ **admin** / **hehe**: `scripts/ensure-admin.ts` после миграций в `docker-entrypoint`; `HEKOTI_FORCE_ADMIN_RESET=1` для принудительного upsert пароля; блок **Account** в админке (`PATCH /api/admin/account`) — смена логина и пароля.
- Docker Compose: сервис `hekoti-app` в сетях `default` + внешняя `proxy-network` (для NPM и др.), тег образа `hekoti-hekoti-app`; остальные сервисы в `default`.
- `POST /api/auth/login` пишет в stdout строки `[hekoti:auth] …` (хост, `x-forwarded-proto`, результат) — удобно для `docker logs` и проверки прокси.
- Versioning: файл `VERSION`, `getAppVersion()`, синхронизация через `postversion`.

### Fixed
- Сборка production: `AuditLog.metadata` сериализуется в JSON-строку под текущую Prisma-схему.
- Security tests: email validation отвергает домены без TLD/двойные точки, TOTP verification возвращает `false` вместо исключения для нестандартной длины кода.
- Middleware: CSRF HMAC переведён на Web Crypto API, чтобы не импортировать Node `crypto` в Edge Runtime.
- `npm start`: production-запуск теперь включает `HEKOTI_ENFORCE_PROD_SECRETS=1`, как Docker entrypoint, чтобы не стартовать с дефолтными секретами.
- Сессия за HTTPS reverse proxy: флаг `Secure` на cookie учитывает заголовок `X-Forwarded-Proto` (не только `APP_URL`).
- Docker: `package-lock.json` синхронизирован с npm 10 (как в образе `node:22-alpine`): в lock добавлены `@emnapi/core` и `@emnapi/runtime@1.10.0`, без чего `npm ci --omit=dev` завершался ошибкой «Missing from lock file».
- `admin-editor.tsx`: стили `panelStyle` / `buttonStyle` / `inputStyle` в начале файла + `CSSProperties` из `react` (сборка Docker/TS).
- `POST /api/auth/login`: разбор тела без строгого Zod (меньше ложных 400), явные сообщения; в форме входа — `credentials: "same-origin"` и заголовок `Content-Type`.

### Changed

- Вход в админку: пароль; при включённом TOTP — второй шаг с кодом из приложения (без лимита попыток на стороне API). Cookie `Secure` в production включается только если `APP_URL` с протоколом `https:` (или задайте `SESSION_COOKIE_INSECURE=1`). В Compose добавлен `APP_URL` по умолчанию `http://localhost:3310`.
- Docker Compose: для `hekoti-app` по умолчанию задаётся `LANGUAGETOOL_URL=http://hekoti-languagetool:8010` (можно переопределить или отключить в `.env`).

### Removed

- Плавающая кнопка Donate в правом нижнем углу (страница `/donate` сохраняется).

### Fixed

- ESLint: каталог `snibox-master` исключён из проверки (сторонний Rails/Vue, ломал CI).
- ESLint `react-hooks/set-state-in-effect`: переключатель темы без `setState` в `useEffect`.

## [0.1.0] — 2026-04-22

- Базовая линия: Next.js wiki, Prisma, Docker, сиды, UI (шапка, подвал, главная).
