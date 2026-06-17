import { readFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../../package.json";

const SEMVER = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;

function readVersionFile(): string | null {
  const raw = readFileSync(join(process.cwd(), "VERSION"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    return SEMVER.test(trimmed) ? trimmed : null;
  }
  return null;
}

export function getAppVersion(): string {
  try {
    const fromFile = readVersionFile();
    if (fromFile) return fromFile;
  } catch {
    console.warn("[hekoti] VERSION missing or unreadable, falling back to package.json");
  }
  return pkg.version;
}
