# Dependabot (HeKoti)

## Симптом

```
Error: Command failed with exit code 1: .../bin/run update_files
Dependabot encountered an error performing the update
```

## Частые причины

1. **Peer conflicts** — `package.json` `overrides` (emnapi, eslint, hono) + strict npm ERESOLVE.
2. **Раздельные bump'ы** — например только `vitest` без `@vitest/*`.
3. **Рассинхрон** — `package.json` и `package-lock.json` не в одном коммите.

## Что сделано

| Мера | Эффект |
|------|--------|
| [`.npmrc`](../.npmrc) → `legacy-peer-deps=true` | Dependabot и CI могут собрать lockfile |
| [`.github/dependabot.yml`](../.github/dependabot.yml) → groups `vitest`, `prisma`, `next` | Связанные пакеты обновляются вместе |
| `ignore: @emnapi/*` | Не ломать overrides на 1.11.1 |

## Проверка локально

```bash
npm ci
npm run typecheck
```

После правок lockfile:

```bash
npm install --package-lock-only
git add package.json package-lock.json
```
