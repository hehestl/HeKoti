import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/auth";

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
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid or empty JSON body." }, { status: 400 });
  }

  const parsed = readLoginBody(json);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  try {
    await loginAdmin(parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    const status = message.includes("Invalid") ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
