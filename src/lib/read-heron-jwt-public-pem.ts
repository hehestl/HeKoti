// Sync with hehestl-db-hedra/ops/heron-auth/lib/read-heron-jwt-public-pem.ts

import { existsSync, readFileSync } from "node:fs";

import { HeronJwtPublicKeyError } from "@/lib/heron-jwt-public-key-errors";
import {
  isHeronJwtPublicKeyPemContent,
  looksLikeHeronJwtPublicKeyPath,
  parseHeronJwtPublicKeyPemBlocks,
} from "@/lib/parse-heron-jwt-public-pem-blocks";

function normalizePemNewlines(pem: string): string {
  return pem.replace(/\\n/g, "\n");
}

function readFileUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new HeronJwtPublicKeyError(
      `HERON_JWT_PUBLIC_KEY_PATH="${path}" — file not found. ` +
        `Verify mount: docker exec hekoti cat ${path} | head -1`,
    );
  }
  return readFileSync(path, "utf8");
}

export function readHeronJwtPublicKeyPemFile(): string {
  const envPath = process.env.HERON_JWT_PUBLIC_KEY_PATH?.trim();
  const envPem = process.env.HERON_JWT_PUBLIC_KEY_PEM?.trim();

  if (envPath) {
    return readFileUtf8(envPath);
  }

  if (!envPem) {
    throw new HeronJwtPublicKeyError(
      "Missing HERON_JWT_PUBLIC_KEY_PATH or HERON_JWT_PUBLIC_KEY_PEM",
    );
  }

  if (isHeronJwtPublicKeyPemContent(envPem)) {
    return normalizePemNewlines(envPem);
  }

  if (looksLikeHeronJwtPublicKeyPath(envPem)) {
    console.warn(
      "[heron-jwt] HERON_JWT_PUBLIC_KEY_PEM looks like a path — use HERON_JWT_PUBLIC_KEY_PATH",
    );
    return readFileUtf8(envPem);
  }

  return normalizePemNewlines(envPem);
}

export function readHeronJwtPublicKeyPemBlocks(): string[] {
  return parseHeronJwtPublicKeyPemBlocks(readHeronJwtPublicKeyPemFile());
}

export function readHeronJwtPublicKeyPem(): string {
  return readHeronJwtPublicKeyPemBlocks()[0]!;
}
