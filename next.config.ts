import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const SEMVER = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;

function readAppVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "VERSION"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (SEMVER.test(trimmed)) return trimmed;
    }
  } catch {
    /* VERSION missing during build — fallback below */
  }
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version?: string };
    if (pkg.version && SEMVER.test(pkg.version)) return pkg.version;
  } catch {
    /* ignore */
  }
  return "0.0.0";
}

const appVersion = readAppVersion();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  env: {
    HEKOTI_APP_VERSION: appVersion,
    NEXT_PUBLIC_HEKOTI_APP_VERSION: appVersion,
  },
};

export default nextConfig;
