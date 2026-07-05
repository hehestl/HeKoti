# Wiki PKCE deploy checklist (Hedra)

## 0. Heron Auth (сначала)

```bash
cd /opt/app && git pull
bash /opt/app/ops/heron-auth/scripts/bootstrap-prod-deploy-root.sh

cd /opt/app/prod/hh-heron-auth
grep -E 'HERON_PUBLIC_BASE_URL|NEXT_PUBLIC_HERON_PUBLIC_BASE_URL' .env
# оба = https://id.hehestl.su

HERON_GATE_BFF_SMOKE=0 \
DEPLOY_HERON_FRONTEND=1 \
HERON_FORCE_REBUILD_FRONTEND=1 \
bash up-on-server.sh
```

Heron docs: [`hehestl-db-hedra/ops/heron-auth/docs/ops-prod-deploy-root.md`](../../../hehestl-db-hedra/ops/heron-auth/docs/ops-prod-deploy-root.md)

## 1. Database (Hedra)

Миграции накатывает `up-on-server.sh`. Проверка:

```bash
# 0138 hekoti-wiki redirect URI
psql "$DATABASE_URL" -c "SELECT client_id, redirect_uris FROM heron.oauth_clients WHERE client_id='hekoti-wiki';"
```

## 2. Wiki `.env`

Каталог deploy wiki (instance `wiki`), см. `.env.wiki.example`:

```env
NEXT_PUBLIC_HERON_AUTH_URL=https://id.hehestl.su
NEXT_PUBLIC_APP_URL=https://wiki.hehestl.su
NEXT_PUBLIC_HERON_OAUTH_CLIENT_ID=hekoti-wiki
HERON_AUTH_API_URL=http://heron-auth:8080
HERON_JWT_ISSUER=https://id.hehestl.su
HERON_OAUTH_CLIENT_ID=hekoti-wiki
```

Wiki app должен быть в Docker-сети с `heron-auth-api` (`hh-network` / `hedra-postgres_db_net` + attach к Heron).

## 3. Rebuild Wiki

```bash
cd /path/to/hekoti/deploy   # COMPOSE_PROJECT_NAME=hh-wiki
docker compose build --no-cache hekoti-app && docker compose up -d hekoti-app
```

## 4. Smoke

| Test | Expected |
|------|----------|
| Preflight | `WIKI_CONTAINER=hh-wiki-app HERON_FE=heron-auth-fe bash scripts/preflight-wiki-heron.sh` → exit 0 |
| Health | `curl -s https://wiki.hehestl.su/api/health/heron` → `"bffReachable": true`, `"hasJwtKey": true` |
| PKCE smoke | `bash scripts/smoke-wiki-heron-pkce.sh` → silent authorize → wiki callback |
| Direct `/auth/login` | Heron UI → `callback?code=` → session |
| Hub tile Hekoti | `wiki/auth/login?auto=1` → silent or one interactive login → `/ru/admin` |
| BFF internal | `docker exec hh-wiki-app wget -qO- --timeout=3 http://heron-auth:8080/health` |
| Public URL | no `heron.hehestl.com` in browser redirects |

### Auth loop decision tree

| Symptom | Fix |
|---------|-----|
| POST login 200 on `id.hehestl.su`, then `/login?oauth=1` again | Heron deploy + internal `HERON_AUTH_API_URL`; Heron FE `oauthResume` from pending cookie |
| `prompt=none` wiki ↔ id loop | hekoti `sessionStorage` silent-failed flag; use `?interactive=1` to force login |
| `callback?code=` then back to Heron | JWT public key on wiki + `hh-network` to `heron-auth:8080` |
| `error=invalid_request` on callback | migration 0138 + wiki rebuild `--no-cache` |

## 5. Rollback

`NEXT_PUBLIC_HERON_OAUTH_LEGACY_FRAGMENT=1` + rebuild wiki (deprecated fragment flow).
