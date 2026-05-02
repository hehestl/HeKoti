// Scans each prisma/migrations/<name>/migration.sql for destructive SQL before prisma migrate deploy.
// Exits 1 if DROP DATABASE, DROP SCHEMA, DROP TABLE, DROP TYPE, or TRUNCATE is found,
// unless HEKOTI_MIGRATE_ALLOW_DESTRUCTIVE=1 (intentional one-off deploy).
// HEKOTI_SKIP_DESTRUCTIVE_MIGRATION_CHECK=1 skips this script (emergency only).
const fs = require("fs");
const path = require("path");

if (process.env.HEKOTI_SKIP_DESTRUCTIVE_MIGRATION_CHECK === "1") {
  console.warn(
    "[hekoti:migrate-check] HEKOTI_SKIP_DESTRUCTIVE_MIGRATION_CHECK=1 — skipping destructive SQL scan (not recommended).",
  );
  process.exit(0);
}

const ALLOW = process.env.HEKOTI_MIGRATE_ALLOW_DESTRUCTIVE === "1";

function stripSqlComments(sql) {
  return sql
    .replace(/--[^\n\r]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

const PATTERNS = [
  { name: "DROP DATABASE", re: /\bDROP\s+DATABASE\b/i },
  { name: "DROP SCHEMA", re: /\bDROP\s+SCHEMA\b/i },
  { name: "DROP TABLE", re: /\bDROP\s+TABLE\b/i },
  { name: "DROP TYPE", re: /\bDROP\s+TYPE\b/i },
  { name: "TRUNCATE", re: /\bTRUNCATE\b/i },
];

function scanFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const sql = stripSqlComments(raw);
  const hits = [];
  for (const { name, re } of PATTERNS) {
    if (re.test(sql)) {
      hits.push(name);
    }
  }
  return hits;
}

function main() {
  const root = process.cwd();
  const migrationsDir = path.join(root, "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error("[hekoti:migrate-check] prisma/migrations not found.");
    process.exit(1);
  }

  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let bad = false;
  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    if (!fs.existsSync(sqlPath)) {
      continue;
    }
    const hits = scanFile(sqlPath);
    if (hits.length === 0) {
      continue;
    }
    console.error(`[hekoti:migrate-check] ${dir}/migration.sql — potentially destructive: ${hits.join(", ")}`);
    bad = true;
  }

  if (!bad) {
    console.info("[hekoti:migrate-check] No DROP DATABASE/SCHEMA/TABLE/TYPE or TRUNCATE in migration SQL.");
    process.exit(0);
  }

  if (ALLOW) {
    console.warn(
      "[hekoti:migrate-check] HEKOTI_MIGRATE_ALLOW_DESTRUCTIVE=1 — proceeding despite destructive patterns. Ensure you have a DB backup.",
    );
    process.exit(0);
  }

  console.error(
    "[hekoti:migrate-check] Refusing to start: destructive SQL detected in migrations.\n" +
      "  • Review the migration files above.\n" +
      "  • Take a PostgreSQL backup before applying.\n" +
      "  • If this change is intentional, set HEKOTI_MIGRATE_ALLOW_DESTRUCTIVE=1 for this deploy only.\n" +
      "  • To skip this guard (not recommended), set HEKOTI_SKIP_DESTRUCTIVE_MIGRATION_CHECK=1.",
  );
  process.exit(1);
}

main();
