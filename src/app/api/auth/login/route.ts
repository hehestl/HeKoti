import { NextResponse } from "next/server";
import { loginAdminPasswordStep } from "@/lib/auth";
import { limitPasswordLogin, requestIp } from "@/lib/auth-rate-limit";

const LOG = "[hekoti:auth]";

function readLoginBody(body: unknown): { email: string; password: string } | { error: string } {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected a JSON object with email and password." };
  }
  const raw = body as Record<string, unknown>;
  const emailRaw = raw.email;
  const passwordRaw = raw.password;

  const email =
    typeof emailRaw === "string"
      ? emailRaw.trim()
      : emailRaw === null || emailRaw === undefined
        ? ""
        : String(emailRaw).trim();

  const password =
    typeof passwordRaw === "string"
      ? passwordRaw
      : passwordRaw === null || passwordRaw === undefined
        ? ""
        : String(passwordRaw);

  if (!email) {
    return { error: "Email is required." };
  }
  if (!password) {
    return { error: "Password is required." };
  }
  return { email, password };
}

export async function POST(request: Request) {
  const xfProto = request.headers.get("x-forwarded-proto") ?? "—";
  const xfHost = request.headers.get("x-forwarded-host") ?? "—";
  const host = request.headers.get("host") ?? "—";
  console.info(`${LOG} POST /api/auth/login host=${host} x-forwarded-host=${xfHost} x-forwarded-proto=${xfProto}`);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    console.warn(`${LOG} bad JSON body`);
    return NextResponse.json({ ok: false, message: "Invalid or empty JSON body." }, { status: 400 });
  }

  const parsed = readLoginBody(json);
  if ("error" in parsed) {
    console.warn(`${LOG} validation: ${parsed.error}`);
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const ip = requestIp(request);
  const limit = await limitPasswordLogin(ip, parsed.email);
  if (limit.blocked) {
    return NextResponse.json(
      { ok: false, message: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // Constant-time response to prevent timing attacks
  const startTime = Date.now();
  const MIN_RESPONSE_TIME_MS = 200; // Minimum response time
  
  try {
    const result = await loginAdminPasswordStep(parsed);
    console.info(`${LOG} login ok email=${parsed.email} totp=${result.needsTotp ? "pending" : "off"}`);
    
    // Ensure minimum response time to prevent timing attacks
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
    }
    
    if (result.needsTotp) {
      return NextResponse.json({ ok: true, needsTotp: true, pendingToken: result.pendingToken });
    }
    return NextResponse.json({ ok: true, needsTotp: false });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Login failed";
    const status = raw.includes("Invalid") ? 401 : 500;
    const message = status === 401 ? "Invalid credentials." : "Login failed";
    console.warn(`${LOG} login failed status=${status} message=${message}`);
    
    // Ensure minimum response time even on failure
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
    }
    
    return NextResponse.json({ ok: false, message }, { status });
  }
}
