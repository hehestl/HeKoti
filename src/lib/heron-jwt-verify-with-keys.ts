import {
  importSPKI,
  jwtVerify,
  type JWTVerifyOptions,
  type KeyLike,
} from "jose";

import {
  HeronJwtVerifyError,
  formatHeronJwtVerifyDockerHint,
} from "@/lib/heron-jwt-public-key-errors";

type VerifyOptions = Omit<JWTVerifyOptions, "algorithms">;

export async function jwtVerifyWithHeronPublicKeys(
  token: string,
  publicKeys: KeyLike | KeyLike[],
  options: VerifyOptions,
) {
  const keys = Array.isArray(publicKeys) ? publicKeys : [publicKeys];
  if (keys.length === 0) {
    throw new HeronJwtVerifyError("No Heron JWT public keys configured", {
      hint: formatHeronJwtVerifyDockerHint(),
    });
  }

  let lastErr: unknown;
  for (const key of keys) {
    try {
      return await jwtVerify(token, key, {
        ...options,
        algorithms: ["EdDSA"],
      });
    } catch (e) {
      lastErr = e;
    }
  }

  throw new HeronJwtVerifyError(
    "Heron JWT verification failed (no matching public key)",
    { cause: lastErr, hint: formatHeronJwtVerifyDockerHint() },
  );
}

export async function importHeronJwtPublicKeysFromPemBlocks(
  blocks: string[],
): Promise<CryptoKey[]> {
  return Promise.all(blocks.map((pem) => importSPKI(pem, "EdDSA")));
}
