#!/usr/bin/env node
/**
 * Lightweight HH standards check for hekoti deploy bundle.
 * Exits 0 with warnings on stderr (CI-friendly).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let warnings = 0;

function warn(msg) {
  warnings += 1;
  console.warn(`[hh-standards] ${msg}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

if (!fs.existsSync(path.join(root, ".agentrules"))) {
  warn("missing .agentrules in repo root");
} else {
  const ar = read(".agentrules");
  if (!ar.includes("domain: social")) warn(".agentrules: expected domain social");
  if (!ar.includes("/opt/app/ops/hh/chat")) warn(".agentrules: expected Profile B app path");
  if (!ar.includes("host: 3310")) warn(".agentrules: expected host 3310");
}

const compose = read("docker-compose.yml");
if (!compose.includes("hh-network")) warn("docker-compose.yml: expected hh-network");
if (!compose.includes("max-size: \"10m\"")) warn("docker-compose.yml: expected logging max-size 10m");
if (!compose.includes("hh-hekoti-lt")) warn("docker-compose.yml: expected container_name hh-hekoti-lt");
if (!compose.includes("127.0.0.1:3310:3310")) warn("docker-compose.yml: expected 127.0.0.1:3310 bind");
if (/container_name:\s*hekoti-languagetool/.test(compose)) warn("docker-compose.yml: legacy container_name hekoti-languagetool");
if (/container_name:\s*[^h\n]*hehe/.test(compose)) warn("docker-compose.yml: hehe in container_name");

if (warnings > 0) {
  console.warn(`[hh-standards] ${warnings} warning(s)`);
} else {
  console.log("[hh-standards] OK");
}

process.exit(0);
