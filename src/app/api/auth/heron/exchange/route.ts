import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { limitHeronExchange, requestIp } from "@/lib/auth-rate-limit";
import { env } from "@/lib/env";
import { HeronExchangeError, resolveOrCreateUserFromHeron } from "@/lib/heron-exchange";
import { isHeronAuthConfigured, verifyHeronAccessToken } from "@/lib/heron-auth-server";
import { safeReturnPath } from "@/lib/heron-auth-client";

const LOG = "[hekoti:heron-exchange]";

function resolveHeronPostLoginReturn(role: UserRole, explicit?: string): string {
  const path = explicit ? safeReturnPath(explicit) : "";
  if (role === UserRole.ADMIN) {
    const isHome =
      !path || path === "/" || /^\/[a-z]{2}(-[A-Z]{2})?$/i.test(path);
    if (isHome) {
      return safeReturnPath(env.HEKOTI_HERON_DEFAULT_RETURN);
    }
  }
  return path || "/";
}

function readBody(
  body: unknown,
):
  | { accessToken: string; returnTo?: string }
  | { code: string; codeVerifier: string; redirectUri: string; nonce?: string; returnTo?: string }
  | { error: string } {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected JSON object." };
  }
  const raw = body as Record<string, unknown>;
  const code = typeof raw.code === "string" ? raw.code.trim() : "";
  if (code) {
    const codeVerifier =
      typeof raw.codeVerifier === "string"
        ? raw.codeVerifier.trim()
        : typeof raw.code_verifier === "string"
          ? raw.code_verifier.trim()
          : "";
    const redirectUri =
      typeof raw.redirectUri === "string"
        ? raw.redirectUri.trim()
        : typeof raw.redirect_uri === "string"
          ? raw.redirect_uri.trim()
          : "";
    if (!codeVerifier || !redirectUri) {
      return { error: "codeVerifier and redirectUri are required with code." };
    }
    const nonce = typeof raw.nonce === "string" ? raw.nonce.trim() : undefined;
    const returnTo =
      typeof raw.returnTo === "string" ? safeReturnPath(raw.returnTo) : undefined;
    return { code, codeVerifier, redirectUri, nonce, returnTo };
  }
  const accessToken =
    typeof raw.accessToken === "string"
      ? raw.accessToken.trim()
      : typeof raw.access_token === "string"
        ? raw.access_token.trim()
        : "";
  if (!accessToken) return { error: "accessToken or code is required." };
  const returnTo =
    typeof raw.returnTo === "string" ? safeReturnPath(raw.returnTo) : undefined;
  return { accessToken, returnTo };
}

type ResolveAccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; status: 503 | 401; message: string; step?: string };

async function resolveAccessToken(
  parsed:
    | { accessToken: string; returnTo?: string }
    | { code: string; codeVerifier: string; redirectUri: string; nonce?: string; returnTo?: string },
): Promise<ResolveAccessTokenResult> {
  if ("accessToken" in parsed) {
    return { ok: true, accessToken: parsed.accessToken };
  }

  const apiUrl = env.HERON_AUTH_API_URL?.trim().replace(/\/$/, "");
  const issuer = env.HERON_JWT_ISSUER?.trim();
  const clientId = env.HERON_OAUTH_CLIENT_ID?.trim();

  if (!apiUrl || !issuer || !clientId) {
    console.error(
      "[Auth Exchange] Missing HERON_AUTH_API_URL, HERON_JWT_ISSUER, or HERON_OAUTH_CLIENT_ID",
    );
    return {
      ok: false,
      status: 503,
      message: "Authentication service misconfigured.",
    };
  }

  const audience = env.HERON_JWT_AUDIENCE?.trim() || "hekoti-wiki";
  const { exchangeHeronAuthorizationCode } = await import(
    "@/lib/heron-shared/heron-oidc.client"
  );

  const exchanged = await exchangeHeronAuthorizationCode(
    {
      apiUrl,
      issuer,
      audiences: [audience],
      fetchTimeoutMs: Number(env.HERON_FETCH_TIMEOUT_MS) || 5000,
    },
    {
      code: parsed.code,
      codeVerifier: parsed.codeVerifier,
      redirectUri: parsed.redirectUri,
      clientId,
      nonce: parsed.nonce,
    },
  );

  if (!exchanged.ok) {
    console.warn(`${LOG} token_exchange status=${exchanged.status} msg=${exchanged.message}`);
    return {
      ok: false,
      status: 401,
      message: exchanged.message,
      step: "token_exchange",
    };
  }
  console.info(`${LOG} token_exchange status=200`);
  return { ok: true, accessToken: exchanged.data.accessToken };
}

export async function POST(request: Request) {
  if (!isHeronAuthConfigured()) {
    return NextResponse.json({ ok: false, message: "Heron Auth is not enabled." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = readBody(json);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const mode = "code" in parsed ? "code" : "accessToken";
  console.info(`${LOG} mode=${mode}`);

  const resolved = await resolveAccessToken(parsed);
  if (!resolved.ok) {
    return NextResponse.json(
      { ok: false, message: resolved.message, step: resolved.step },
      { status: resolved.status },
    );
  }

  const ip = requestIp(request);
  const verified = await verifyHeronAccessToken(resolved.accessToken);
  if (!verified) {
    console.warn(`${LOG} jwt_verify fail step=jwt_verify`);
    return NextResponse.json(
      { ok: false, message: "Invalid Heron access token.", step: "jwt_verify" },
      { status: 401 },
    );
  }
  console.info(`${LOG} jwt_verify ok sub=${verified.sub} jti=${verified.jti ?? "none"}`);

  const limit = await limitHeronExchange(
    ip,
    verified.sub,
    env.HEKOTI_HERON_EXCHANGE_RATE_LIMIT,
  );
  if (limit.blocked) {
    return NextResponse.json(
      { ok: false, message: "Too many exchange attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    const result = await resolveOrCreateUserFromHeron(resolved.accessToken, verified);
    console.info(`${LOG} session created userId=${result.user.id} sub=${verified.sub}`);

    const returnTo = resolveHeronPostLoginReturn(result.role, parsed.returnTo);

    return NextResponse.json({
      ok: true,
      role: result.role,
      returnTo,
    });
  } catch (error) {
    if (error instanceof HeronExchangeError) {
      console.warn(`${LOG} resolve fail`, {
        step: error.step ?? "user_resolve",
        reason: error.reason,
        message: error.message,
      });
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
          step: error.step ?? "user_resolve",
          reason: error.reason,
        },
        { status: error.status },
      );
    }
    console.error(`${LOG} resolve unexpected error`, error);
    return NextResponse.json({ ok: false, message: "Exchange failed.", step: "internal" }, { status: 500 });
  }
}
