import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import {
  donateConfigPatchSchema,
  getDonateConfig,
  saveDonateConfig,
  type DonateConfig,
} from "@/lib/donate-config";

export async function GET() {
  try {
    await requireAdminUser();
    const config = await getDonateConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load donate config";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = donateConfigPatchSchema.parse(await request.json());
    const current = await getDonateConfig();
    const next: DonateConfig = {
      platforms: body.platforms ?? current.platforms,
      crypto: body.crypto ?? current.crypto,
      contacts: body.contacts ?? current.contacts,
    };
    await saveDonateConfig(next);
    return NextResponse.json({ ok: true, config: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save donate config";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
