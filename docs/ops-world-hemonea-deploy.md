# Hekoti World на hemonea (`w.hehestl.su`)

Runbook по prod-деплою **второго** инстанса Hekoti (instance `world`) на той же VM, что `wiki.hehestl.su`.  
Канон путей и доменов: [`hehestl-getway-bots/deploy/docs/domains.md`](../../hehestl-getway-bots/deploy/docs/domains.md).

> **Не путать** с [`ops-wiki-hehestl-deploy.md`](../../h-com/hekoti/docs/ops-wiki-hehestl-deploy.md) (wiki на **hehestl** + WireGuard).  
> `w.hehestl.su` на prod сейчас — **hemonea**, DNS A → IP hemonea.

## Карта

| Поле | Значение |
|------|----------|
| URL | `https://w.hehestl.su` |
| Deploy root | `/opt/app/prod/hh-world` |
| Container | `hh-world-app` |
| Host port (debug) | `127.0.0.1:3311` |
| App port (в контейнере / Traefik) | `3310` |
| `HEKOTI_INSTANCE` | `world` |
| `COMPOSE_PROJECT_NAME` | `hh-world` |
| Postgres DB | `hekoti_world_db` (Hedra colocated, `hh-network`) |
| OAuth client Heron | **`hekoti-wiki`** (отдельного `hekoti-world` нет) |

Источник кода для `world`: rsync из monorepo `hekoti/` (не `wiki/`):

```bash
bash /opt/app/prod/deploy/scripts/sync-hekoti.sh world
```

## Compose — всегда три overlay

На hemonea **без** `deploy/docker-compose.wiki-prod.yml` Traefik не видит router → **`404 page not found`** снаружи, при этом `curl http://127.0.0.1:3311/en` работает.

```bash
COMPOSE="-f docker-compose.yml \
  -f deploy/docker-compose.external-deps.yml \
  -f deploy/docker-compose.wiki-prod.yml"
```

| Файл | Зачем |
|------|--------|
| `docker-compose.yml` | образ app |
| `deploy/docker-compose.external-deps.yml` | без embedded PG/Redis; Hedra `POSTGRES_HOST`, `REDIS_URL` |
| `deploy/docker-compose.wiki-prod.yml` | Traefik labels + сеть `hehe-net` |

Шаблон env: [`.env.world.example`](../.env.world.example).

### Первый запуск

```bash
cd /opt/app/prod
git pull
bash deploy/scripts/sync-hekoti.sh world

cd /opt/app/prod/hh-world
cp .env.world.example .env
# заполнить POSTGRES_PASSWORD, HEKOTI_ADMIN_PASSWORD, уникальные секреты

mkdir -p secrets
cp /opt/app/prod/hh-heron-auth/secrets/heron_jwt_public.pem secrets/heron_jwt_public.pem
chmod 400 secrets/heron_jwt_public.pem
# Важно: ФАЙЛ, не каталог — иначе Docker создаст пустую папку на mount

NO_CACHE=1 sh scripts/deploy-update.sh
# или:
NO_CACHE=1 docker compose $COMPOSE build --no-cache hekoti-app
docker compose $COMPOSE up -d --force-recreate hekoti-app
docker restart traefik
```

### Обновление (rebuild)

```bash
cd /opt/app/prod/hh-world
git pull   # или sync-hekoti.sh world
NO_CACHE=1 sh scripts/deploy-update.sh
```

`deploy-update.sh` подключает `wiki-prod.yml`, если задан `HEKOTI_PUBLIC_HOST` (для world — `w.hehestl.su`).

## Traefik smoke

```bash
docker inspect hh-world-app --format '{{index .Config.Labels "traefik.enable"}}'
# → true

docker inspect hh-world-app --format '{{index .Config.Labels "traefik.http.routers.hekoti-world.rule"}}'
# → Host(`w.hehestl.su`)

docker network inspect hehe-net --format '{{range .Containers}}{{.Name}} {{end}}' | tr ' ' '\n' | grep world

curl -sI https://w.hehestl.su/en | head -3    # HTTP/2 200
curl -sI http://127.0.0.1:3311/en | head -3 # HTTP/1.1 200
```

Восстановить labels без rebuild:

```bash
docker compose $COMPOSE up -d --force-recreate hekoti-app
docker restart traefik
```

Скрипт: `scripts/diagnose-traefik.sh` (если есть в deploy root).

## Heron SSO

См. также [`auth-heron.md`](auth-heron.md).

### Env (канон world)

```env
HEKOTI_HERON_AUTH_ENABLED=1
HERON_OAUTH_CLIENT_ID=hekoti-wiki
HERON_JWT_AUDIENCE=hekoti-wiki
NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID=hekoti-wiki
HERON_AUTH_API_URL=https://id.hehestl.su
HERON_JWT_ISSUER=https://id.hehestl.su
HERON_JWT_PUBLIC_KEY_PATH=/run/secrets/heron_jwt_public.pem
```

OIDC access token `aud` = **client_id** (`hekoti-wiki`), не `hehe-ecosystem`.

### Redirect URI (Hedra)

```text
https://w.hehestl.su/auth/heron-callback
```

Добавить к клиенту `hekoti-wiki` (рядом с `https://wiki.hehestl.su/auth/heron-callback`).

### Фикс `Invalid Heron access token` после `jwt_verify ok`

**Симптом в логах:**

```text
[hekoti:heron-exchange] token_exchange status=200
[hekoti:heron-exchange] jwt_verify ok
# UI: Invalid Heron access token
```

**Причина:** double JWT verify — `jti` съедается в route, второй verify в `resolveOrCreateUserFromHeron` без `preVerified`.

**Проверка исходников до build:**

```bash
grep preVerified src/lib/heron-exchange.ts
grep resolveOrCreateUserFromHeron src/app/api/auth/heron/exchange/route.ts
# должно: resolveOrCreateUserFromHeron(resolved.accessToken, verified)
```

**Патч на сервере (если старая копия route):**

```bash
sed -i 's/resolveOrCreateUserFromHeron(resolved\.accessToken)/resolveOrCreateUserFromHeron(resolved.accessToken, verified)/' \
  src/app/api/auth/heron/exchange/route.ts
```

**Rebuild:**

```bash
bash scripts/deploy-heron-preverified-fix.sh
# или NO_CACHE=1 sh scripts/deploy-update.sh
```

**Smoke bundle:**

```bash
docker exec hh-world-app sh -c \
  'grep -rq "profile endpoints unavailable\|heron-exchange:resolve" /app/.next/server && echo FIX_OK || echo FIX_MISSING'
```

После фикса в логах при логине:

```text
jwt_verify ok sub=... jti=...
[hekoti:heron-exchange] session created userId=...
```

### PEM

```bash
docker exec hh-world-app test -r /run/secrets/heron_jwt_public.pem && echo PEM_OK
docker exec hh-world-app sha256sum /run/secrets/heron_jwt_public.pem
# эталон с hh-heron-auth: sha256 65747f07...
```

## Роль ADMIN и доступ в админку

Роль при SSO: grant Heron `service_key=hekoti`, `role=admin`. Без grant → `READER` → редирект с `/en/admin` на `/en`.

**Симптом:** `profile endpoints unavailable; using verified jwt.sub` — BFF не достучался до `/api/auth/me` / service-grants; grants пустые → `READER`.

**Grant на Hedra (предпочтительно):**

```sql
INSERT INTO heron.service_grants (user_id, service_key, role, granted_by)
VALUES ('<jwt-sub-uuid>', 'hekoti', 'admin', '<jwt-sub-uuid>')
ON CONFLICT (user_id, service_key) DO UPDATE SET role = 'admin';
```

**Аварийно в БД world** (без `-it` при pipe):

```bash
echo 'UPDATE "User" SET role = '\''ADMIN'\'' WHERE "heronSubjectId" IS NOT NULL;' \
  | docker exec -i hh-world-app npx prisma db execute --stdin

docker exec hedra-postgres-postgres-1 psql -U hekoti_world_user -d hekoti_world_db \
  -c 'SELECT id, email, role, "heronSubjectId" FROM "User";'
```

Роль читается из БД на каждый запрос — после `UPDATE` можно открыть `https://w.hehestl.su/en/admin` без перелогина.  
**Не логиниться снова** через Heron, пока нет grant — exchange перезапишет роль в `READER`.

Первый SSO на пустой БД: `heron-exchange.ts` (как на wiki) может bootstrap `ADMIN`, если `heronLinkedCount === 0 || adminCount === 0`.

## Маскот в шапке (`/hekoti.png`)

Слот один: `HekotiMascotLink` → `/hekoti.png`, рамка `clamp(64px, 12vw, 120px)`, `object-fit: contain`.

Маленький персонаж внутри рамки = **другой PNG** или лишние прозрачные поля в файле (не CSS).

```bash
sha256sum /opt/app/prod/hh-wiki/public/hekoti.png
sha256sum /opt/app/prod/hh-world/public/hekoti.png
cp /opt/app/prod/hh-wiki/public/hekoti.png /opt/app/prod/hh-world/public/hekoti.png
# при необходимости — rebuild образа
```

## Типичные ошибки

| Симптом | Причина | Fix |
|---------|---------|-----|
| `404 page not found` (Traefik) | Нет `wiki-prod.yml` / app не в `hehe-net` | `$COMPOSE up --force-recreate` + `docker restart traefik` |
| `Invalid Heron access token`, лог `jwt_verify ok` | Старый route без 2-го аргумента `verified` | patch route + `NO_CACHE` rebuild |
| `jwt_verify fail` | `HERON_JWT_AUDIENCE` ≠ `hekoti-wiki` или битый PEM | env + файл PEM |
| `token_exchange` fail | Нет redirect `w.hehestl.su` в OAuth client | Hedra `hekoti-wiki` |
| SSO OK, нет админки | `READER`, нет grant | service_grants или `UPDATE User` |
| `profile endpoints unavailable` | Heron `/api/auth/me` недоступен из контейнера | сеть, `HERON_AUTH_API_URL`, сравнить с `hh-wiki-app` |
| Маскот мелкий | Неверный `hekoti.png` | скопировать с `hh-wiki` |
| `docker exec -it` + heredoc | TTY + stdin | `docker exec -i` без `-t` |

## Сравнение wiki vs world (hemonea)

| | wiki | world |
|---|------|-------|
| Path | `/opt/app/prod/hh-wiki` | `/opt/app/prod/hh-world` |
| Host | `wiki.hehestl.su` | `w.hehestl.su` |
| Port | 3310 | 3311 |
| SSOT кода | `wiki/` (monorepo) | `hekoti/` |
| Compose overlays | те же три файла | те же три файла |
| Heron client | `hekoti-wiki` | `hekoti-wiki` |

## Скрипты

| Скрипт | Назначение |
|--------|------------|
| `scripts/deploy-update.sh` | git pull, build, recreate с overlays |
| `scripts/deploy-heron-preverified-fix.sh` | NO_CACHE rebuild + smoke SSO bundle |
| `scripts/verify-heron-exchange-bake.sh` | source + bundle checks |
| `scripts/verify-heron-jwt-in-container.sh` | PEM mount |
| `scripts/diagnose-wiki-heron-bake.sh` | `NEXT_PUBLIC_*` в client chunks |
| `scripts/diagnose-traefik.sh` | Traefik labels + HTTPS smoke |

## Чеклист после деплоя

- [ ] `curl -sI https://w.hehestl.su/en` → 200
- [ ] `traefik.enable=true` на `hh-world-app`
- [ ] `hh-world-app` в `hehe-net`
- [ ] `grep resolveOrCreateUserFromHeron.*verified` в `route.ts`
- [ ] Heron login → `session created` в логах
- [ ] `hekoti.png` sha256 совпадает с wiki (или каноничный ассет)
- [ ] Grant `hekoti/admin` или `User.role=ADMIN` для своего `heronSubjectId`
