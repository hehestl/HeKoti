import { NextResponse } from "next/server";
import { z } from "zod";
import { loginAdmin } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    await loginAdmin({ ...payload, ipKey: ip });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }
    // Invalid credentials / rate limit / TOTP — not a malformed body
    const status =
      message.includes("Invalid") ||
      message.includes("Too many") ||
      message.includes("TOTP")
        ? 401
        : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
