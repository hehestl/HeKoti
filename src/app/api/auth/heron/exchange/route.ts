import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { limitHeronExchange, requestIp } from "@/lib/auth-rate-limit";
import { env } from "@/lib/env";
import { HeronExchangeError, resolveOrCreateUserFromHeron } from "@/lib/heron-exchange";
import { isHeronAuthConfigured, verifyHeronAccessToken } from "@/lib/heron-auth-server";
import { safeReturnPath } from "@/lib/heron-auth-client";

function readBody(body: unknown): { accessToken: string; returnTo?: string } | { error: string } {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected JSON object with accessToken." };
  }
  const raw = body as Record<string, unknown>;
  const accessToken =
    typeof raw.accessToken === "string"
      ? raw.accessToken.trim()
      : typeof raw.access_token === "string"
        ? raw.access_token.trim()
        : "";
  if (!accessToken) return { error: "accessToken is required." };
  const returnTo =
    typeof raw.returnTo === "string" ? safeReturnPath(raw.returnTo) : undefined;
  return { accessToken, returnTo };
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

  const ip = requestIp(request);
  const verified = await verifyHeronAccessToken(parsed.accessToken);
  if (!verified) {
    return NextResponse.json({ ok: false, message: "Invalid Heron access token." }, { status: 401 });
  }

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
    const result = await resolveOrCreateUserFromHeron(parsed.accessToken);

    const defaultReturn =
      result.role === UserRole.ADMIN
        ? safeReturnPath(env.HEKOTI_HERON_DEFAULT_RETURN)
        : "/";
    const returnTo = parsed.returnTo ?? defaultReturn;

    return NextResponse.json({
      ok: true,
      role: result.role,
      returnTo,
    });
  } catch (error) {
    if (error instanceof HeronExchangeError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "Exchange failed." }, { status: 500 });
  }
}
