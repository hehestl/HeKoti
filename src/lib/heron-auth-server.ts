import { type JWTPayload } from "jose";
import { env } from "@/lib/env";
import {
  HeronJwtPublicKeyError,
  formatHeronJwtVerifyDockerHint,
} from "@/lib/heron-jwt-public-key-errors";
import {
  importHeronJwtPublicKeysFromPemBlocks,
  jwtVerifyWithHeronPublicKeys,
} from "@/lib/heron-jwt-verify-with-keys";
import { readHeronJwtPublicKeyPemBlocks } from "@/lib/read-heron-jwt-public-pem";

export type VerifiedHeronToken = {
  sub: string;
  jti?: string;
};

const consumedJti = new Map<string, number>();
const JTI_TTL_MS = 120_000;

type HeronJwtRuntime = {
  apiUrl: string;
  issuer: string;
  audience: string;
  publicKeys: CryptoKey[];
  fetchTimeoutMs: number;
};

let cachedRuntime: HeronJwtRuntime | null | undefined;

function pruneJtiCache(now: number): void {
  for (const [jti, exp] of consumedJti) {
    if (exp <= now) consumedJti.delete(jti);
  }
}

function consumeJti(jti: string): boolean {
  const now = Date.now();
  pruneJtiCache(now);
  if (consumedJti.has(jti)) return false;
  consumedJti.set(jti, now + JTI_TTL_MS);
  return true;
}

function readSub(payload: JWTPayload): string | null {
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub.trim()) return null;
  return sub.trim();
}

function readJti(payload: JWTPayload): string | undefined {
  const jti = payload.jti;
  if (typeof jti !== "string" || !jti.trim()) return undefined;
  return jti.trim();
}

async function loadPublicKeys(): Promise<CryptoKey[]> {
  const blocks = readHeronJwtPublicKeyPemBlocks();
  return importHeronJwtPublicKeysFromPemBlocks(blocks);
}

async function getHeronJwtRuntime(): Promise<HeronJwtRuntime | null> {
  if (cachedRuntime !== undefined) return cachedRuntime;

  const apiUrl = env.HERON_AUTH_API_URL?.trim().replace(/\/$/, "");
  const issuer = env.HERON_JWT_ISSUER?.trim();
  const audience = env.HERON_JWT_AUDIENCE?.trim();
  if (!apiUrl || !issuer || !audience) {
    cachedRuntime = null;
    return null;
  }

  try {
    const publicKeys = await loadPublicKeys();
    if (publicKeys.length === 0) {
      cachedRuntime = null;
      return null;
    }
    const timeoutRaw = env.HERON_FETCH_TIMEOUT_MS?.trim();
    const fetchTimeoutMs =
      timeoutRaw && Number.isFinite(Number(timeoutRaw)) && Number(timeoutRaw) > 0
        ? Math.min(15_000, Number(timeoutRaw))
        : 5000;
    cachedRuntime = { apiUrl, issuer, audience, publicKeys, fetchTimeoutMs };
    return cachedRuntime;
  } catch (err) {
    if (err instanceof HeronJwtPublicKeyError) {
      console.error(`[heron-jwt] ${err.message}. ${formatHeronJwtVerifyDockerHint()}`);
    }
    cachedRuntime = null;
    return null;
  }
}

export function isHeronAuthConfigured(): boolean {
  return env.HEKOTI_HERON_AUTH_ENABLED === "1";
}

type HeronJwtVerifyFailReason =
  | "runtime_not_configured"
  | "empty_token"
  | "missing_sub"
  | "jti_replay"
  | "audience_mismatch"
  | "issuer_mismatch"
  | "token_expired"
  | "signature_invalid"
  | "verify_failed";

function mapJoseErrorToReason(err: unknown): HeronJwtVerifyFailReason {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code);
    if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      const claim = (err as { claim?: string }).claim;
      if (claim === "aud") return "audience_mismatch";
      if (claim === "iss") return "issuer_mismatch";
      if (claim === "exp") return "token_expired";
    }
    if (code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" || code === "ERR_JWT_INVALID") {
      return "signature_invalid";
    }
  }
  return "verify_failed";
}

function logJwtVerifyFail(reason: HeronJwtVerifyFailReason, extra?: Record<string, string>): void {
  console.warn("[heron-jwt-verify] fail", { reason, ...extra });
}

export async function verifyHeronAccessToken(token: string): Promise<VerifiedHeronToken | null> {
  const cfg = await getHeronJwtRuntime();
  if (!cfg) {
    logJwtVerifyFail("runtime_not_configured");
    return null;
  }
  const raw = token.trim();
  if (!raw) {
    logJwtVerifyFail("empty_token");
    return null;
  }

  try {
    const { payload } = await jwtVerifyWithHeronPublicKeys(raw, cfg.publicKeys, {
      issuer: cfg.issuer,
      audience: cfg.audience,
      clockTolerance: 30,
    });
    const sub = readSub(payload);
    if (!sub) {
      logJwtVerifyFail("missing_sub");
      return null;
    }
    const jti = readJti(payload);
    if (jti && !consumeJti(jti)) {
      logJwtVerifyFail("jti_replay", {
        hint: "second verify on same token — rebuild with preVerified fix (see scripts/deploy-heron-preverified-fix.sh)",
      });
      return null;
    }
    return { sub, jti };
  } catch (err) {
    logJwtVerifyFail(mapJoseErrorToReason(err));
    return null;
  }
}

export type HeronMeDto = {
  userId: string;
  email?: string | null;
};

export type HeronServiceGrant = {
  service_key: string;
  role: string;
};

type JsonRecord = Record<string, unknown>;

function pickString(obj: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function parseMeBody(body: JsonRecord): HeronMeDto | null {
  const nested =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as JsonRecord)
      : null;
  const userId = pickString(body, "userId", "user_id", "sub") ?? (nested ? pickString(nested, "userId", "user_id") : undefined);
  if (!userId) return null;
  const email = pickString(body, "email") ?? (nested ? pickString(nested, "email") : undefined);
  return { userId, email: email ?? null };
}

function parseGrantsBody(body: JsonRecord): HeronServiceGrant[] {
  const raw = body.grants;
  if (!Array.isArray(raw)) return [];
  const grants: HeronServiceGrant[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as JsonRecord;
    const service_key = pickString(row, "serviceKey", "service_key");
    const role = pickString(row, "role");
    if (service_key && role) grants.push({ service_key, role });
  }
  return grants;
}

function heronProfileBaseUrls(apiUrl: string): string[] {
  const bases = [apiUrl.replace(/\/$/, "")];
  const rust = process.env.HERON_AUTH_RUST_API_URL?.trim().replace(/\/$/, "");
  if (rust && !bases.includes(rust)) bases.push(rust);
  return bases;
}

async function fetchHeronProfilePath(
  apiUrl: string,
  path: string,
  accessToken: string,
  fetchTimeoutMs: number,
): Promise<HeronMeDto | null> {
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(fetchTimeoutMs),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[heron_me]", { base: apiUrl, path, status: res.status });
      return null;
    }
    const body = (await res.json().catch(() => ({}))) as JsonRecord;
    return parseMeBody(body);
  } catch (err) {
    console.warn("[heron_me]", {
      base: apiUrl,
      path,
      reason: "fetch_error",
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function heronFetchPath(
  apiUrl: string,
  path: string,
  accessToken: string,
  fetchTimeoutMs: number,
): Promise<Response | null> {
  try {
    return await fetch(`${apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(fetchTimeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[heron_fetch]", {
      base: apiUrl,
      path,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function heronFetch(path: string, accessToken: string): Promise<Response | null> {
  const cfg = await getHeronJwtRuntime();
  if (!cfg) return null;
  for (const base of heronProfileBaseUrls(cfg.apiUrl)) {
    const res = await heronFetchPath(base, path, accessToken, cfg.fetchTimeoutMs);
    if (res?.ok) return res;
  }
  return null;
}

export async function fetchHeronMe(accessToken: string): Promise<HeronMeDto | null> {
  const cfg = await getHeronJwtRuntime();
  const token = accessToken.trim();
  if (!cfg || !token) return null;

  for (const base of heronProfileBaseUrls(cfg.apiUrl)) {
    const me = await fetchHeronProfilePath(base, "/api/auth/me", token, cfg.fetchTimeoutMs);
    if (me?.userId) return me;
    const userinfo = await fetchHeronProfilePath(base, "/oauth2/userinfo", token, cfg.fetchTimeoutMs);
    if (userinfo?.userId) return userinfo;
  }
  return null;
}

export async function fetchHeronServiceGrants(accessToken: string): Promise<HeronServiceGrant[]> {
  const res = await heronFetch("/api/auth/me/service-grants", accessToken);
  if (!res?.ok) return [];
  const body = (await res.json().catch(() => ({}))) as JsonRecord;
  return parseGrantsBody(body);
}

export function normalizeUuid(value: string): string {
  return value.trim().toLowerCase();
}

export function heronSubMatches(a: string, b: string): boolean {
  return normalizeUuid(a) === normalizeUuid(b);
}
