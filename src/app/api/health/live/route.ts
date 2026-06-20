import { NextResponse } from "next/server";
import { clearSsrWindowPollution } from "@/lib/node-globals-guard";

export async function GET() {
  clearSsrWindowPollution();
  return NextResponse.json({ ok: true, status: "live" });
}
