// Sync with hehestl-db-hedra/ops/heron-auth/lib/parse-heron-jwt-public-pem-blocks.ts

import { HeronJwtPublicKeyError } from "@/lib/heron-jwt-public-key-errors";

export const HERON_JWT_PUBLIC_KEY_BEGIN = "-----BEGIN PUBLIC KEY-----";

const PEM_BLOCK_RE =
  /-----BEGIN PUBLIC KEY-----\s*[\s\S]*?\s*-----END PUBLIC KEY-----/g;

export function isHeronJwtPublicKeyPemContent(value: string): boolean {
  return value.includes(HERON_JWT_PUBLIC_KEY_BEGIN);
}

export function looksLikeHeronJwtPublicKeyPath(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    /\.pem$/i.test(trimmed)
  );
}

export function parseHeronJwtPublicKeyPemBlocks(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new HeronJwtPublicKeyError("Empty PEM content");
  }
  const matches = trimmed.match(PEM_BLOCK_RE);
  if (!matches?.length) {
    throw new HeronJwtPublicKeyError(
      "No valid PEM blocks found. Expected -----BEGIN PUBLIC KEY----- … -----END PUBLIC KEY-----",
    );
  }
  return matches.map((block) => block.trim().replace(/\r\n/g, "\n"));
}
