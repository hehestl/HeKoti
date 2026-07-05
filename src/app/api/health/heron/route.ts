import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isHeronAuthConfigured } from "@/lib/heron-auth-server";
import { readHeronJwtPublicKeyPemBlocks } from "@/lib/read-heron-jwt-public-pem";

const LOG = "[hekoti:health:heron]";

function hasJwtKey(): boolean {
  try {
    return readHeronJwtPublicKeyPemBlocks().length > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  const enabled = isHeronAuthConfigured();
  const hasApiUrl = Boolean(env.HERON_AUTH_API_URL?.trim());
  const hasIssuer = Boolean(env.HERON_JWT_ISSUER?.trim());
  const hasClientId = Boolean(env.HERON_OAUTH_CLIENT_ID?.trim());
  const hasJwtKeyConfigured = hasJwtKey();

  let bffReachable = false;
  const apiUrl = env.HERON_AUTH_API_URL?.trim().replace(/\/$/, "");
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/health`, {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      bffReachable = res.ok;
    } catch (error) {
      console.warn(`${LOG} BFF health fetch failed`, error instanceof Error ? error.message : error);
    }
  }

  const configOk =
    !enabled ||
    (hasJwtKeyConfigured && hasApiUrl && hasIssuer && hasClientId && bffReachable);

  return NextResponse.json(
    {
      ok: configOk,
      enabled,
      config: {
        hasJwtKey: hasJwtKeyConfigured,
        hasApiUrl,
        hasIssuer,
        hasClientId,
        bffReachable,
      },
    },
    { status: configOk ? 200 : 503 },
  );
}
