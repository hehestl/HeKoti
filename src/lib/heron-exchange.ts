import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth";
import {
  fetchHeronMe,
  fetchHeronServiceGrants,
  heronSubMatches,
  isHeronAuthConfigured,
  verifyHeronAccessToken,
} from "@/lib/heron-auth-server";
import { isValidEmail } from "@/lib/auth";

const HEKOTI_SERVICE_KEY = "hekoti";

function roleFromGrant(grants: { service_key: string; role: string }[]): UserRole {
  const grant = grants.find((g) => g.service_key === HEKOTI_SERVICE_KEY);
  return grant?.role === "admin" ? UserRole.ADMIN : UserRole.READER;
}

function syntheticSsoEmail(heronSubjectId: string): string {
  return `heron+${heronSubjectId.replace(/-/g, "")}@sso.hekoti.local`;
}

export class HeronExchangeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HeronExchangeError";
  }
}

export async function resolveOrCreateUserFromHeron(accessToken: string) {
  if (!isHeronAuthConfigured()) {
    throw new HeronExchangeError("Heron Auth is not enabled.", 503);
  }

  const verified = await verifyHeronAccessToken(accessToken);
  if (!verified) {
    throw new HeronExchangeError("Invalid Heron access token.", 401);
  }

  const me = await fetchHeronMe(accessToken);
  if (!me?.userId) {
    throw new HeronExchangeError("Heron profile unavailable.", 401);
  }
  if (!heronSubMatches(me.userId, verified.sub)) {
    throw new HeronExchangeError("Heron identity mismatch.", 401);
  }

  const grants = await fetchHeronServiceGrants(accessToken);
  const targetRole = roleFromGrant(grants);

  let user = await prisma.user.findUnique({ where: { heronSubjectId: verified.sub } });

  if (!user && me.email && isValidEmail(me.email)) {
    const byEmail = await prisma.user.findUnique({ where: { email: me.email.trim() } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { heronSubjectId: verified.sub, role: targetRole },
      });
    }
  }

  if (!user) {
    const email =
      me.email && isValidEmail(me.email) ? me.email.trim() : syntheticSsoEmail(verified.sub);
    user = await prisma.user.create({
      data: {
        email,
        heronSubjectId: verified.sub,
        role: targetRole,
        passwordHash: null,
      },
    });
  } else if (user.role !== targetRole || !user.heronSubjectId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        heronSubjectId: user.heronSubjectId ?? verified.sub,
        role: targetRole,
      },
    });
  }

  await createUserSession(user.id);
  return { user, role: user.role };
}
