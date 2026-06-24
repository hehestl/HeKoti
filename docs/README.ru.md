# Документация Hekoti (RU)

## Обзор

Hekoti — open-source self-hosted вики, ориентированная на скорость, простую эксплуатацию и удобство админа.

Основные сценарии:

- Публичные страницы знаний с чистыми slug
- Редактирование и управление только админом
- Встроенный AI-чат для перевода, орфографии и поиска информации

## Архитектура

- Frontend + API: Next.js App Router
- База данных: PostgreSQL
- ORM: Prisma
- Опциональный кэш и rate-limit: Redis
- Авторизация: cookie-сессии + TOTP 2FA

## Режимы работы

- Публичное чтение + редактирование админом (по умолчанию)
- Полностью приватный режим (`PUBLIC_READ_MODE=false`)

## Настройка через ENV

Ключевые переменные:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (дефолты в Compose; из них собирается `DATABASE_URL` в контейнере приложения)
- `DATABASE_URL` (в Docker Compose необязателен: собирается из `POSTGRES_*` в `docker-entrypoint.sh`, если не задан явно)
- `REDIS_URL` (опционально)
- `PUBLIC_READ_MODE`
- `ENABLED_LANGUAGES`
- `HEKOTI_ADMIN_EMAIL`
- `HEKOTI_ADMIN_PASSWORD` — bootstrap-админ при пустой таблице `User` (дефолты `admin` / `hehe` из `.env.example`; в production задайте свои значения). Смена пароля после входа: **Админка → Аккаунт**.
- `AI_AGENTS_JSON`
- `DONATE_LINKS_JSON`
- `CRYPTO_DONATION_JSON`
- `LANGUAGETOOL_URL` (опционально, контейнер `hekoti-languagetool` в Docker Compose)

### Медиа (S3-compatible)

- `MEDIA_STORAGE=local` — dev: файлы в `public/uploads` (том `hekoti_uploads` в Compose)
- `MEDIA_STORAGE=s3` — prod: бинарники в bucket, в PostgreSQL только метаданные (`MediaAsset`)
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
- `ASSETS_BASE_URL` — CDN для локального режима

Пример MinIO: задайте `S3_ENDPOINT=https://minio.example.com`, `S3_PUBLIC_URL=https://cdn.example.com`, `forcePathStyle` включён автоматически при наличии endpoint.

## AI-агенты

Можно сразу подключать несколько провайдеров через `AI_AGENTS_JSON`.

Встроенные дефолты: OpenAI, Gemini, Claude, Grok, DeepSeek, Qwen, Copilot.

### Команды в админ-чате

- `/agent list`
- `/agent set <id>`
- `/agent on <id>`
- `/ask <текст>`

История чата сохраняется в БД (`AgentChannel` / `AgentMessage`) и отображается в админке.

## Основные API

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/confirm`
- `GET|POST /api/agent/chat`
- `GET|POST /api/pages`
- `PATCH /api/pages/:id`
- `POST /api/media/upload`
- `POST /api/media/presign` — presigned PUT для видео (требует `MEDIA_STORAGE=s3`)
- `POST /api/media/complete` — регистрация видео после прямой загрузки в S3
- `GET /api/admin/media` — галерея медиа (метаданные в БД, файлы в S3 или `LOCAL_UPLOAD_DIR`)
- `DELETE /api/admin/media/:id` — удаление файла и soft-delete записи
- `POST /api/webhooks/incoming`
- `GET /api/health` — сводная проверка (БД обязательна для `200`)
- `GET /api/health/live`
- `GET /api/health/ready`
- `POST /api/spellcheck` — прокси к LanguageTool (только админ, нужен `LANGUAGETOOL_URL`)

## Несколько экземпляров на одной VM (2–4+)

Один репозиторий — несколько deploy-корней (`/opt/app/ops/hh/chat`, `world`, `lore` …). Конфликты Docker снимаются через **уникальный `.env`** в каждом корне, не правками `docker-compose.yml`.

| Экземпляр | `HEKOTI_INSTANCE` | `COMPOSE_PROJECT_NAME` | host port | internal network |
|-----------|-------------------|------------------------|-----------|------------------|
| chat (legacy) | `hekoti` | `hh-hekoti` | 3310 | `hh-network` |
| world | `world` | `hh-world` | 3311 | `hh-world-net` |
| lore (3-й) | `lore` | `hh-lore` | 3312 | `hh-lore-net` |

### Чеклист перед `docker compose up`

1. `HEKOTI_INSTANCE` и `COMPOSE_PROJECT_NAME` уникальны
2. `HEKOTI_HOST_PORT` свободен (`ss -tlnp`)
3. `POSTGRES_*` уникальны; секреты — свои или автоген (`HEKOTI_AUTO_SECRETS=1`, по умолчанию)
4. `SESSION_COOKIE_NAME` и `APP_URL` — свои (поддомен на экземпляр)
5. Slug ≤ ~15 символов (`hh-{slug}-app` ≤ 24)
6. Запись в ops / port-registry

### LanguageTool

| `HEKOTI_LT_MODE` | Compose | `LANGUAGETOOL_URL` |
|------------------|---------|-------------------|
| `embedded` | `COMPOSE_PROFILES=embedded-lt` | `http://hekoti-languagetool:8010` |
| `external` | `docker compose -f docker-compose.yml -f deploy/docker-compose.external-lt.yml` | `http://hh-shared-lt:8010` |
| `off` | без profile | пусто |

### Внешний PostgreSQL (общий контейнер на hedra)

Сервис в compose называется **`hekoti-app`**, не `app`. Override: [`deploy/docker-compose.external-db.yml`](deploy/docker-compose.external-db.yml).

```bash
# Postgres hedra должен быть в сети HEKOTI_DB_DOCKER_NETWORK
docker network create hedra-db   # или существующая сеть
docker network connect hedra-db hedra-postgres-postgres-1

cd /opt/app/prod/hh/core/wiki
docker compose -f docker-compose.yml -f deploy/docker-compose.external-db.yml up -d --build
```

В `.env` экземпляра (уникальная БД на вики):

```env
HEKOTI_INSTANCE=wiki
COMPOSE_PROJECT_NAME=hh-wiki
HEKOTI_HOST_PORT=3310
APP_URL=https://wiki.hehestl.com
HEKOTI_DB_DOCKER_NETWORK=hedra-db
POSTGRES_HOST=hedra-postgres-postgres-1
POSTGRES_DB=hekoti_wiki_db
POSTGRES_USER=hekoti_wiki_user
POSTGRES_PASSWORD=...
```

Без `external-db.yml` поднимается свой `hh-{instance}-pg` в стеке — проще для старта.

Общий LT (рекомендуется для 2+ вики):

```bash
docker network create hh-shared-net   # один раз
docker compose -f deploy/docker-compose.shared-lt.yml up -d
```

Шаблон второго экземпляра: `.env.world.example`, `.agentrules.instance.example`.

### NPM

Upstream только на app-контейнер: `http://hh-{instance}-app:3310` (порт **внутри** контейнера). Postgres и Redis в `proxy-network` не подключаются.

### Деплой world

```bash
cd /opt/app/ops/hh/world
cp .env.world.example .env   # отредактировать секреты
docker network create proxy-network   # если нет
docker compose -f docker-compose.yml -f deploy/docker-compose.external-lt.yml up -d --build
curl -sf http://127.0.0.1:3311/api/health
```

## Чек-лист эксплуатации

1. Скопируйте `.env.example` в `.env` и смените секреты.
2. Перед первым запуском примените миграции.
3. Вынесите HTTPS на reverse proxy.
4. Мониторьте всплески 401/403 и ошибки вебхуков.
5. Делайте регулярный backup PostgreSQL.
