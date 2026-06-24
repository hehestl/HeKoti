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
if (!compose.includes("HEKOTI_INSTANCE")) warn("docker-compose.yml: expected HEKOTI_INSTANCE parametrization");
if (!compose.includes("HEKOTI_HOST_PORT")) warn("docker-compose.yml: expected HEKOTI_HOST_PORT");
if (!compose.includes("HEKOTI_DOCKER_NETWORK")) warn("docker-compose.yml: expected HEKOTI_DOCKER_NETWORK");
if (!compose.includes("npm_proxy")) warn("docker-compose.yml: expected npm_proxy network");
if (!compose.includes("embedded-lt")) warn("docker-compose.yml: expected embedded-lt profile for LanguageTool");
if (!compose.includes("max-size: \"10m\"")) warn("docker-compose.yml: expected logging max-size 10m");
if (!compose.includes("hh-${HEKOTI_INSTANCE")) warn("docker-compose.yml: expected hh-${HEKOTI_INSTANCE} container_name pattern");
if (/container_name:\s*hekoti-languagetool/.test(compose)) warn("docker-compose.yml: legacy container_name hekoti-languagetool");
if (/container_name:\s*[^h\n]*hehe/.test(compose)) warn("docker-compose.yml: hehe in container_name");

if (!fs.existsSync(path.join(root, "deploy/docker-compose.shared-lt.yml"))) {
  warn("missing deploy/docker-compose.shared-lt.yml");
}
if (!fs.existsSync(path.join(root, "deploy/docker-compose.external-lt.yml"))) {
  warn("missing deploy/docker-compose.external-lt.yml");
}
if (!fs.existsSync(path.join(root, "deploy/docker-compose.external-db.yml"))) {
  warn("missing deploy/docker-compose.external-db.yml");
}

if (warnings > 0) {
  console.warn(`[hh-standards] ${warnings} warning(s)`);
} else {
  console.log("[hh-standards] OK");
}

process.exit(0);
