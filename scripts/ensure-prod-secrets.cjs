#!/usr/bin/env node
/**
 * Ensure production HMAC/crypto secrets exist.
 * - Explicit env (≥32 chars) wins
 * - Else load from HEKOTI_SECRETS_FILE on persistent volume
 * - Else generate random hex and persist
 *
 * Usage:
 *   node scripts/ensure-prod-secrets.cjs           # write file, set process.env, log summary
 *   node scripts/ensure-prod-secrets.cjs --export  # print shell exports for docker-entrypoint.sh
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SECRET_NAMES = ["WEBHOOK_SECRET", "AUTH_PENDING_SECRET", "HEKOTI_TOTP_ENCRYPTION_KEY"];
const MIN_LENGTH = 32;

function isStrong(value) {
  const trimmed = (value ?? "").trim();
  return trimmed.length >= MIN_LENGTH;
}

function generateSecret() {
  return crypto.randomBytes(32).toString("hex");
}

function defaultSecretsFile() {
  const uploadRoot = (process.env.LOCAL_UPLOAD_DIR || "public/uploads").replace(/\\/g, "/");
  return path.join(uploadRoot, ".hekoti", "runtime-secrets.env");
}

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function ensureProdSecrets(options = {}) {
  if (process.env.HEKOTI_AUTO_SECRETS === "0") {
    return { secrets: {}, filePath: null, generated: [], skipped: true };
  }

  const filePath = path.resolve(
    options.secretsFile ?? process.env.HEKOTI_SECRETS_FILE ?? defaultSecretsFile(),
  );

  let fileSecrets = {};
  if (fs.existsSync(filePath)) {
    try {
      fileSecrets = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    } catch {
      fileSecrets = {};
    }
  }

  const secrets = {};
  const generated = [];
  const fromEnv = [];
  const fromFile = [];

  for (const name of SECRET_NAMES) {
    const envVal = process.env[name];
    if (isStrong(envVal)) {
      secrets[name] = envVal.trim();
      fromEnv.push(name);
      continue;
    }
    const fileVal = fileSecrets[name];
    if (isStrong(fileVal)) {
      secrets[name] = fileVal.trim();
      fromFile.push(name);
      continue;
    }
    secrets[name] = generateSecret();
    generated.push(name);
  }

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const body =
    "# Auto-generated runtime secrets — do not commit. Regenerated only when missing.\n" +
    `# ${new Date().toISOString()}\n` +
    SECRET_NAMES.map((name) => `${name}=${secrets[name]}`).join("\n") +
    "\n";
  fs.writeFileSync(filePath, body, { mode: 0o600 });

  for (const [name, value] of Object.entries(secrets)) {
    process.env[name] = value;
  }

  return { secrets, filePath, generated, fromEnv, fromFile, skipped: false };
}

function main() {
  const exportMode = process.argv.includes("--export");
  const result = ensureProdSecrets();

  if (result.skipped) {
    if (exportMode) return;
    console.log("[hekoti-secrets] HEKOTI_AUTO_SECRETS=0 — skipping auto-generation");
    return;
  }

  if (exportMode) {
    for (const name of SECRET_NAMES) {
      const value = result.secrets[name];
      if (value) process.stdout.write(`export ${name}=${shellEscape(value)}\n`);
    }
    return;
  }

  const parts = [];
  if (result.fromEnv.length) parts.push(`env: ${result.fromEnv.join(", ")}`);
  if (result.fromFile.length) parts.push(`file: ${result.fromFile.join(", ")}`);
  if (result.generated.length) parts.push(`generated: ${result.generated.join(", ")}`);
  console.log(`[hekoti-secrets] ${parts.join("; ")} → ${result.filePath}`);
}

if (require.main === module) {
  main();
}

module.exports = { ensureProdSecrets, SECRET_NAMES, MIN_LENGTH, parseEnvFile, isStrong };
