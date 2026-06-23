// Sync with hehestl-db-hedra/ops/heron-auth/lib/heron-jwt-public-key-errors.ts

export class HeronJwtPublicKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeronJwtPublicKeyError";
  }
}

export class HeronJwtVerifyError extends Error {
  readonly hint?: string;

  constructor(message: string, options?: { cause?: unknown; hint?: string }) {
    super(message, { cause: options?.cause });
    this.name = "HeronJwtVerifyError";
    this.hint = options?.hint;
  }
}

export function formatHeronJwtVerifyDockerHint(
  containerName = process.env.HERON_JWT_CONTAINER_NAME?.trim() || "hekoti",
): string {
  const path =
    process.env.HERON_JWT_PUBLIC_KEY_PATH?.trim() ||
    "/run/secrets/heron_jwt_public.pem";
  return (
    `Verify key in container: docker exec ${containerName} cat ${path} | head -1 ` +
    `(expected -----BEGIN PUBLIC KEY-----)`
  );
}
