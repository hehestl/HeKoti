#!/usr/bin/env node
/**
 * Lightweight HH standards check for hekoti deploy bundle.
 * Compose/agentrules: warnings. Hardcoded domains in src/: exit 1.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let warnings = 0;

const FORBIDDEN_PATTERNS = [
  /heron\.hehestl\.com/i,
  /wiki\.hehestl\.com/i,
  /id\.hehestl\.su/i,
];

const SRC_SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function warn(msg) {
  warnings += 1;
  console.warn(`[hh-standards] ${msg}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const dirPath = path.join(dir, entry);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  }
}

function scanSrcForHardcodedDomains() {
  const srcRoot = path.join(root, "src");
  let hasViolations = false;

  walkDir(srcRoot, (filePath) => {
    const ext = path.extname(filePath);
    if (!SRC_SCAN_EXTENSIONS.has(ext)) return;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const relPath = path.relative(root, filePath);

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          console.error(`[hh-standards] [FAIL] Hardcoded domain in ${relPath}:${index + 1}`);
          console.error(`[hh-standards]        ${trimmed}`);
          hasViolations = true;
        }
      }
    });
  });

  return hasViolations;
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
if (!compose.includes("NEXT_PUBLIC_HERON_AUTH_URL")) warn("docker-compose.yml: expected NEXT_PUBLIC_HERON_AUTH_URL build arg");

if (!fs.existsSync(path.join(root, "deploy/docker-compose.shared-lt.yml"))) {
  warn("missing deploy/docker-compose.shared-lt.yml");
}
if (!fs.existsSync(path.join(root, "deploy/docker-compose.external-lt.yml"))) {
  warn("missing deploy/docker-compose.external-lt.yml");
}
if (!fs.existsSync(path.join(root, "deploy/docker-compose.external-db.yml"))) {
  warn("missing deploy/docker-compose.external-db.yml");
}

const domainViolations = scanSrcForHardcodedDomains();

if (domainViolations) {
  console.error("[hh-standards] Hardcoded domains in src/ — move to .env");
  process.exit(1);
}

if (warnings > 0) {
  console.warn(`[hh-standards] ${warnings} warning(s)`);
} else {
  console.log("[hh-standards] OK");
}

process.exit(0);
