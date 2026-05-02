import { NextResponse } from "next/server";
import { loginAdminTotpStep } from "@/lib/auth";
import { limitTotpLogin, requestIp } from "@/lib/auth-rate-limit";

function readTotpBody(body: unknown): { pendingToken: string; code: string } | { error: string } {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected JSON with pendingToken and code." };
  }
  const raw = body as Record<string, unknown>;
  const pendingToken =
    typeof raw.pendingToken === "string"
      ? raw.pendingToken
      : raw.pendingToken === null || raw.pendingToken === undefined
        ? ""
        : String(raw.pendingToken);
  const code =
    typeof raw.code === "string"
      ? raw.code
      : raw.code === null || raw.code === undefined
        ? ""
        : String(raw.code);
  if (!pendingToken) {
    return { error: "pendingToken is required." };
  }
  if (!code.trim()) {
    return { error: "code is required." };
  }
  return { pendingToken, code };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid or empty JSON body." }, { status: 400 });
  }

  const parsed = readTotpBody(json);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const ip = requestIp(request);
  const limit = await limitTotpLogin(ip);
  if (limit.blocked) {
    return NextResponse.json(
      { ok: false, message: "Too many verification attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    await loginAdminTotpStep(parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Login failed";
    const status = raw.includes("Invalid") || raw.includes("Expired") || raw.includes("code") ? 401 : 500;
    const message = status === 401 ? "Invalid verification code." : "Login failed";
    return NextResponse.json({ ok: false, message }, { status });
  }
}
