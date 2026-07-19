# Changelog

Все изменения Hekoti.  
Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/), упрощённый.

Правило: **одна строка = одно изменение**; начинать с модуля/области.  
Пример: `- Admin: версия приложения из файла VERSION`

Перед релизом: перенести `[Unreleased]` → `## [x.y.z] — YYYY-MM-DD`, затем `npm run release:*`.

## [Unreleased]

### Added
- Docs: `docs/ops-world-hemonea-deploy.md` — runbook `w.hehestl.su` на hemonea (Traefik, Heron SSO, ADMIN, маскот)
- Ops: `scripts/diagnose-traefik.sh`, `scripts/deploy-heron-preverified-fix.sh` (world/wiki/lore)
- Heron SSO: OIDC Authorization Code + PKCE (`src/lib/heron-shared/`, silent Hub SSO, legacy fragment opt-out)
- Docs: `docs/ops-wiki-pkce-deploy.md`, PKCE flow в `docs/auth-heron.md`
- Deploy: `deploy/docker-compose.external-deps.yml` (app-only без embedded PG/Redis)
- Ops: `check-hh-standards.cjs` — scan `src/` на hardcoded домены (exit 1)
- Heron anti-loop: `sessionStorage` silent-failed flag, `interactive=1`, `isRetryableOidcError`
- Ops: `scripts/preflight-wiki-heron.sh`, `scripts/smoke-wiki-heron-pkce.sh`
- API: `GET /api/health/heron` — JWT/BFF config probe (без секретов)

### Changed
- Heron SSO: убран hardcode `heron.hehestl.com` / `wiki.hehestl.com`; `NEXT_PUBLIC_*` bake при Docker build из `.env`
- `exchange/route.ts`: strict env guards для `HERON_AUTH_API_URL`, `HERON_JWT_ISSUER`, `HERON_OAUTH_CLIENT_ID`
- `docker-compose.yml`: Heron runtime env + build.args для `NEXT_PUBLIC_*`
- `exchange/route.ts`: structured logs `[hekoti:heron-exchange]` (mode, token_exchange, jwt_verify, session)
- `buildAuthLoginPath`: optional `interactive=1` для принудительного interactive login

### Fixed
- Heron SSO: `preVerified` в exchange route — jti replay (`jwt_verify ok` → Invalid token)
- `.env.world.example` — канон hemonea (`hehe-net`, `hekoti-wiki`, Hedra PG)
- Heron JWT: `KeyLike` заменён на `CryptoKey` (jose v6, ломал `npm run build` в Docker)
- Deploy: internal network по умолчанию `hh-{HEKOTI_INSTANCE}-net`; `.env.wiki.example` для hedra
- Deploy: `deploy/docker-compose.external-db.yml` — `depends_on: !reset`, `HEKOTI_DB_DOCKER_NETWORK` → `hh-network`
- Heron auth loop (wiki): silent SSO не повторяется после `login_required` / `invalid_request`
- Heron auth loop (id): password login возвращает `oauthResume` из pending OIDC cookie (heron-auth FE)

## [0.4.8] — 2026-06-24

### Added
- Ops: автогенерация `WEBHOOK_SECRET` / `AUTH_PENDING_SECRET` / `HEKOTI_TOTP_ENCRYPTION_KEY` при старте (`scripts/ensure-prod-secrets.cjs`, том uploads)

## [0.4.7] — 2026-06-17

### Added
- Docker: multi-instance — `HEKOTI_INSTANCE`, `COMPOSE_PROJECT_NAME`, `HEKOTI_HOST_PORT`, изолированные сети/volumes; LT `embedded|external|off`; `deploy/docker-compose.shared-lt.yml`, `.env.world.example`, `.agentrules.instance.example`

### Fixed
- Главная (edit): кнопки ↑↓ перемещают только редактируемые категории на одну позицию, без сдвига через 2 и без затрагивания статей-листьев
- Login: убраны подсказки про публичное чтение и Docker-логин по умолчанию (см. `docs/README.*`)

## [0.4.6] — 2026-06-17

### Added

- Editor: link picker — поиск wiki-страниц (incl. drafts) при вставке ссылки, форматы markdown и `/post`
- Editor: gutter «+» — вставка строки после номера; block menu на Ctrl+./Alt+Shift+B
- Editor: callouts `[!NOTE|INFO|TIP|WARNING|SUCCESS]`, CSS blockquote/details/table/todo
- Editor: click-to-copy для `<pre>`/code на read и admin preview
- Editor: block menu/ПКМ — numbered list, quote, table, details, callout, link to page
- Home inline edit: описание блока (`excerpt`), icon grid, ↑↓ и ПКМ перемещение, DnD-слоты и root drop
- Search: `searchText` — индекс заголовков и предложений, pg_trgm GIN, rank по строке, snippet `§ heading`
- Search: matching по title/content/excerpt/slug, ранжирование, OR-fallback на странице результатов
- Search: live-подсказки в поле поиска (`GET /api/wiki/search`), клавиатура и переход к статьям
- Errors: локализованные `not-found` / `error` / `global-error` с маскотом Hekoti
- Site: robots.txt и meta robots — `SITE_ROBOTS_INDEX`, блок `/admin`/`/login`/`/api`
- Site: `/llms.txt` и правила AI-краулеров — `AI_CRAWLERS_ALLOW`, доп. текст в админке

### Fixed

- Build: `[lang]/error.tsx` — client boundary без `@/lib/i18n` (fs/pg не попадают в browser bundle)
- Mascot: ПКМ на главной — fix цикл registerTree/unregisterTree (нестабильный pathTree) + заморозка items меню

### Changed

- Lang switch: client navigation (`Link` + prefetch) вместо full reload — без «затемнения» и быстрее
- Admin: выбор иконки страницы — в окне переименования (убран пункт из ПКМ explorer)
- Home: inline-edit категорий — после «Сохранить» сброс dirty (fix ложного «есть несохранённые изменения»)

## [0.4.5] — 2026-06-21

### Fixed

- Mascot: ПКМ admin-меню на главной — React #185 (HomeInlineEdit + unstable items в AdminContextMenu)
- Home: typewriter в поиске — sample titles по updatedAt (новые статьи в пуле)

## [0.4.4] — 2026-06-21

### Fixed

- Admin: история ревизий — modal overlay (fix layout squeeze)
- Donate: inline-edit через меню маскота (fix выбора контекста и старт редактирования)
- Footer: ссылка «Донат» с главной — полная навигация (fix съеденного клика)
- Home: React #419 — Suspense для LanguageSwitch в RSC, гидрация typewriter/edit UI
- Home: CSP eval — Zod вынесен из client bundle (donate-config), lazy DonateInlineEditProvider
- Home: React #419 — LanguageSwitch без useSearchParams (href с сервера); theme-card/footer — native `<a>`

## [0.4.3] — 2026-06-21

### Added

- Wiki: inline-edit категорий на главной (ПКМ маскот, DnD, иконки, названия)
- Admin: история ревизий статьи (git-review, Monaco diff, metadata, пагинация)

## [0.4.2] — 2026-06-21

### Added

- Home: typewriter-примеры заголовков статей в поле поиска (только главная, пока поле пустое)
- Donate: inline-редактирование платформ, крипто и контактов (ПКМ по маскоту, GlobalSettings)
- Media: S3-compatible storage (`MEDIA_STORAGE=s3`), metadata in `MediaAsset`, presigned video upload
- Admin editor: image/video modal (upload, gallery, insert by URL); toolbar buttons; `<video controls>` on wiki pages
- Wiki: схемы Mermaid и SVG в статьях (server render, dual theme, cache, copy source); seed `/diagrams`

### Fixed

- Wiki: Mermaid server render без `isomorphic-mermaid` (svgdom + DOMPurify patch + fake `location` + restore `globalThis.window`; fix 500/unhealthy)
- Wiki: `clearSsrWindowPollution` в layout/health — сброс «битого» `window` после isomorphic-mermaid
- Docker: healthcheck через `scripts/docker-healthcheck.cjs` (http + timeout); `exec env HOSTNAME=0.0.0.0` при старте
- Wiki: inline-edit на публичной статье — draft не сбрасывается при входе в режим редактирования (stale cleanup useEffect)
- Monaco: inline bootstrap в `<head>` + `/monaco-workers/` same-origin (прод ещё тянул jsdelivr CDN — CORS/worker-src)
- Admin Explorer: убрано дублирующее ПКМ-меню секции языка при клике по строкам дерева (остаётся только меню строки; меню секции — по заголовку RU/EN)
- Admin Explorer: после создания статьи раскрывается только путь к ней, а не всё дерево; пустой список свёрнутых веток в localStorage больше не сбрасывается в «развернуть всё»
- Admin: при создании статьи — поле slug и превью пути (как при переименовании)
- Version: номер версии вшивается при `next build` (`HEKOTI_APP_VERSION`); Docker runner копирует `VERSION` из builder-стадии
- Ops: `deploy-update.sh` — `git pull --autostash`, build-arg `HEKOTI_APP_VERSION`, проверка VERSION в контейнере после деплоя

## [0.4.1] — 2026-06-17

### Added

- Wiki: оглавление (TOC) на публичных страницах с якорями H1–H4
- Wiki: toggle `showToc`, экспорт PDF/CSV/Markdown в админке
- Admin: block menu (+) по клику на номер строки и hotkey (Heading, List, To-do)
- Admin Explorer: множественный выбор (Shift/Ctrl+клик), массовая публикация и сворачивание веток

### Fixed

- Admin Explorer: по ПКМ на строке дерева открывались два контекстных меню (неверный CSS-селектор + всплытие события)
- Admin Explorer: состояние свёрнутых веток сбрасывалось при обновлении дерева (Architecture refresh, deploy) — `pagesByLang` больше не переинициализирует localStorage
- Monaco: workers с same-origin `/monaco-workers/` (CSP `worker-src 'self'` блокировал jsdelivr); прямой `monaco.editor.create` без `@monaco-editor/loader` (CDN в `script-src` тоже запрещён); `monaco-workers-env` до импорта monaco; workers в git и проверка в Docker build
- Wiki inline edit: `registerPage` не сбрасывает baseline/draft во время редактирования
- Admin: исправлено контекстное меню в Monaco (ПКМ больше не закрывается сразу)

## [0.4.0] — 2026-06-21

### Added

- Ops: `.agentrules` — taxonomy social/chat, paths Профиль B, ports ui 3310→3100
- Ops: `npm run check:hh-standards` — проверка `.agentrules` и compose
- Admin: вкладка «Заметки» — внутреннее дерево без публикации в вики (`PageScope.NOTES`)
- Admin: системные заметки `hekoti-welcome` и `hekoti-support` (неудаляемые)

### Changed

- Wiki: inline-редактирование с ПКМ маскота — title, Markdown, publish (админ)
- Docker: сеть `hh-network`, logging rotation, `hh-hekoti-lt`, bind `127.0.0.1:3310`
- Ops: HH Standards — `hh-project-standards.md`, синхронизация `infra-taxonomy`, README paths
- Admin: split `admin-posts-editor.tsx` и `admin-explorer.tsx` — hooks и subcomponents (<300 строк)

### Fixed

- Admin: Monaco — web workers same-origin (webpack bundle), синхронизация `contentMd` при открытии вкладки
- Admin: автосохранение статьи (debounce 1.2 с) при правке title/contentMd

## [0.3.3] — 2026-06-20

### Added

- Admin: язык интерфейса в «Администрирование» (`GlobalSettings.adminLanguage`, кэш словарей)
- Admin: переименование со slug в ПКМ Explorer (live-превью пути)
- Wiki: редирект со старого URL 7 дней после смены slug (`PageRedirect`)

### Fixed

- Admin: текст статьи в Monaco-редакторе — ResizeObserver и измеренная высота вместо `height: 100%` в flex-layout workbench

### Changed

- Wiki: перемещение страницы вместе с вложенными (каскад path), без блокировки «есть дочерние»
- Wiki: иконки категорий отображаются из пресета; пресет `coins`
- Admin: Architecture — запоминание языка и «Зеркалировать структуру» в localStorage

## [0.3.2] — 2026-06-19

- Admin: компактный Explorer sidebar — единый скролл, overlay-actions, app-shell 100dvh
- Architecture: поддержка явного slug в markdown-дереве через `[slug]` (Markdown-DSL)

## [0.3.1] — 2026-06-19

- Admin: PKM — меню справа от клика, прижатие к низу экрана вместо flip «над» строкой
- Admin: activity bar — «Архитектура»/«Корзина» и тема в одном footer-блоке

## [0.3.0] — 2026-06-19

- Wiki: PKM flip/clamp без layout shift; пункт «Удалить» всегда виден
- Wiki: soft delete 3 дня, каскад с единым deletedAt, selective restore, корзина
- Wiki: вкладка «Архитектура» — MD-DSL дерева, server-side sync, AI перевод названий
- UI: маскот на всех страницах (включая админку), клик — на главную
- UI: «Разработано и создано» в подвале — ссылка на главную
- Admin: VS Code-like workbench (activity bar, explorer, tabs, split preview)
- Admin: действия дерева и markdown через ПКМ; языки — сворачиваемые секции explorer
- Admin: dirty tabs с guard beforeunload; preview API `/api/admin/preview`
- Admin: Monaco из бандла (без CDN jsdelivr) — совместимость с CSP
- Security: CSRF cookie на 403; apiFetch bootstrap через `/api/health`
- Admin: маскот в activity bar (ссылка на главную); футер и плавающий маскот скрыты; тема — в левой панели
- Wiki: блок «Как вам статья?» — по центру
- Admin: VS Code explorer — toolbar, DnD без grip, indent guides, категории isCategory, иконки, refresh
- Admin: цвет линий дерева wikiTreeGuideColor в GlobalSettings
- Admin: PKM по маскоту (admin) — админка и версия

## [0.2.0] — 2026-06-19

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

- **Docker build (npm ci)**: в `package-lock.json` добавлены записи `node_modules/@emnapi/core` и `@emnapi/runtime@1.11.1` — npm 10 в `node:22-alpine` требует их для overrides (локальный npm 11 мог пропускать); `fix-lock-emnapi.cjs` при необходимости запускает `npm@10.9.8 install`; overrides + вызов из `deploy-update.sh`.
- **CI typecheck**: `prisma generate` перед `tsc` в Security workflow (`npm ci --ignore-scripts` не генерировал клиент).
- **Зависимости (npm audit)**: `next` 16.2.6, `sanitize-html` 2.17.4, overrides для `hono`, `@hono/node-server`, `fast-uri`, `dompurify`, `postcss`; CI `npm audit fix --dry-run` снова проходит.
- **CSP / клиентский JS**: `script-src` с `'unsafe-inline'` вместо nonce (совместимость с Next.js); блокировка `<meta http-equiv="Content-Security-Policy">` в телеметрии; prefetch исключён из middleware matcher.
- **Языки**: переключатель на `<Link>` — работает даже при частичной загрузке JS.
- **Шапка**: кнопки языков и переключатель темы всегда видны (вторая строка на узком экране, горизонтальный скролл при многих языках).

### Changed

- **Wiki**: рекомендации соседних статей и оценка 💔/🤍/❤️ для авторизованных на листовых статьях.
- **Wiki**: страницы с дочерними URL — каталог (список детей); листья — статья; гибрид — тело родителя над списком; JSON-LD `CollectionPage`/`ItemList`; кеш `wiki-catalog:`.
- **Breadcrumbs**: крошки на donate/login; JSON-LD `BreadcrumbList` в `WikiBreadcrumbs` (prop `pagePath`).
- **Help Center layout**: `WikiPublicShell` вместо глобального TopBar — hero (маскот + поиск + язык / compact без маскота), breadcrumbs `ol/li` с ellipsis, дата статьи (UTC).
- **Шапка**: убраны AI links, кнопка «+», Login/Admin/Logout; справа только компактный переключатель языка (клик по метке — следующий язык, стрелка — меню Radix).
- **Вход в админку**: slash-команды в поиске (`login`, `admin`, `>login`, `/a`, …); короткие URL `/{lang}/a` и `/{lang}/l`; выход — кнопка в админке → Settings (Server Action).
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
- CI: `package-lock.json` синхронизирован — `@emnapi/core@1.11.1`, `@emnapi/runtime@1.11.1`, `@emnapi/wasi-threads@1.2.2` для `npm ci`.
- Ops: `scripts/deploy-update.sh` — git pull, rebuild и `--force-recreate` app; smoke-проверка help-center в HTML.
- Docker entrypoint: ранняя проверка production-секретов в `.env` (понятная ошибка вместо NPM 502).
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
