#!/usr/bin/env node
/**
 * Sync @rolldown/binding-wasm32-wasi emnapi deps in package-lock.json.
 * npm 10 (node:22-alpine) fails npm ci when lock lists 1.10.0 without nested entries.
 */
const fs = require("fs");
const path = require("path");

const lockPath = path.join(__dirname, "..", "package-lock.json");
const text = fs.readFileSync(lockPath, "utf8");

const next = text
  .replace('"@emnapi/core": "1.10.0"', '"@emnapi/core": "1.11.1"')
  .replace('"@emnapi/runtime": "1.10.0"', '"@emnapi/runtime": "1.11.1"');

if (next === text) {
  if (text.includes('"@emnapi/core": "1.10.0"')) {
    console.error("fix-lock-emnapi: pattern not replaced");
    process.exit(1);
  }
  console.log("fix-lock-emnapi: already synced");
  process.exit(0);
}

fs.writeFileSync(lockPath, next);
console.log("fix-lock-emnapi: updated @emnapi/* 1.10.0 -> 1.11.1 in package-lock.json");
