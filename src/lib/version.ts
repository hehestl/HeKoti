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

/** Canonical app version: baked at `next build` from VERSION, runtime file as dev fallback. */
export function getAppVersion(): string {
  const baked = process.env.HEKOTI_APP_VERSION ?? process.env.NEXT_PUBLIC_HEKOTI_APP_VERSION;
  if (baked && SEMVER.test(baked)) return baked;

  try {
    const fromFile = readVersionFile();
    if (fromFile) return fromFile;
  } catch {
    console.warn("[hekoti] VERSION missing or unreadable, falling back to package.json");
  }
  return pkg.version;
}
