import { createPublicKey } from "crypto";
import { importSPKI, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

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
  publicKey: CryptoKey;
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

async function getHeronJwtRuntime(): Promise<HeronJwtRuntime | null> {
  if (cachedRuntime !== undefined) return cachedRuntime;

  const apiUrl = env.HERON_AUTH_API_URL?.trim().replace(/\/$/, "");
  const issuer = env.HERON_JWT_ISSUER?.trim();
  const audience = env.HERON_JWT_AUDIENCE?.trim();
  const pem = env.HERON_JWT_PUBLIC_KEY_PEM?.trim();
  if (!apiUrl || !issuer || !audience || !pem) {
    cachedRuntime = null;
    return null;
  }

  try {
    const nodeKey = createPublicKey(pem);
    const spki = nodeKey.export({ type: "spki", format: "pem" }).toString();
    const publicKey = await importSPKI(spki, "EdDSA");
    const timeoutRaw = env.HERON_FETCH_TIMEOUT_MS?.trim();
    const fetchTimeoutMs =
      timeoutRaw && Number.isFinite(Number(timeoutRaw)) && Number(timeoutRaw) > 0
        ? Math.min(15_000, Number(timeoutRaw))
        : 5000;
    cachedRuntime = { apiUrl, issuer, audience, publicKey, fetchTimeoutMs };
    return cachedRuntime;
  } catch {
    cachedRuntime = null;
    return null;
  }
}

export function isHeronAuthConfigured(): boolean {
  return env.HEKOTI_HERON_AUTH_ENABLED === "1";
}

export async function verifyHeronAccessToken(token: string): Promise<VerifiedHeronToken | null> {
  const cfg = await getHeronJwtRuntime();
  if (!cfg) return null;
  const raw = token.trim();
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, cfg.publicKey, {
      issuer: cfg.issuer,
      audience: cfg.audience,
      algorithms: ["EdDSA"],
      clockTolerance: 30,
    });
    const sub = readSub(payload);
    if (!sub) return null;
    const jti = readJti(payload);
    if (jti && !consumeJti(jti)) return null;
    return { sub, jti };
  } catch {
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

async function heronFetch(path: string, accessToken: string): Promise<Response | null> {
  const cfg = await getHeronJwtRuntime();
  if (!cfg) return null;
  try {
    return await fetch(`${cfg.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(cfg.fetchTimeoutMs),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function fetchHeronMe(accessToken: string): Promise<HeronMeDto | null> {
  const res = await heronFetch("/api/auth/me", accessToken);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => ({}))) as JsonRecord;
  return parseMeBody(body);
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
