import { NextResponse } from "next/server";
import { z } from "zod";
import { loginAdmin } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    await loginAdmin(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }
    const status = message.includes("Invalid") ? 401 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
