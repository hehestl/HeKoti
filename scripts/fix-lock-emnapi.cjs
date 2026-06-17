#!/usr/bin/env node
/**
 * Sync @rolldown/binding-wasm32-wasi emnapi deps in package-lock.json.
 * npm 10 (node:22-alpine) fails npm ci when overrides require @emnapi/*@1.11.1
 * but lock only bumps version strings without node_modules/@emnapi/* entries.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const lockPath = path.join(root, "package-lock.json");

function hasEmnapiLockEntries(text) {
  return (
    text.includes('"node_modules/@emnapi/core"') &&
    text.includes('"node_modules/@emnapi/runtime"') &&
    text.includes('"version": "1.11.1"')
  );
}

const text = fs.readFileSync(lockPath, "utf8");

if (hasEmnapiLockEntries(text)) {
  console.log("fix-lock-emnapi: already synced");
  process.exit(0);
}

const next = text
  .replace('"@emnapi/core": "1.10.0"', '"@emnapi/core": "1.11.1"')
  .replace('"@emnapi/runtime": "1.10.0"', '"@emnapi/runtime": "1.11.1"');

if (next !== text) {
  fs.writeFileSync(lockPath, next);
  console.log("fix-lock-emnapi: bumped @emnapi/* 1.10.0 -> 1.11.1");
}

if (hasEmnapiLockEntries(fs.readFileSync(lockPath, "utf8"))) {
  process.exit(0);
}

console.log("fix-lock-emnapi: missing lock entries; npm@10.9.8 install (Alpine npm ci)");
execSync("npx --yes npm@10.9.8 install --no-audit", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SKIP_HEKOTI_BANNER: "1" },
});
