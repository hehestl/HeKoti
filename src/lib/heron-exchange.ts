import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth";
import {
  fetchHeronMe,
  fetchHeronServiceGrants,
  heronSubMatches,
  isHeronAuthConfigured,
  type VerifiedHeronToken,
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

const LOG = "[hekoti:heron-exchange:resolve]";

export class HeronExchangeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly step?: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = "HeronExchangeError";
  }
}

export async function resolveOrCreateUserFromHeron(
  accessToken: string,
  preVerified?: VerifiedHeronToken,
) {
  if (!isHeronAuthConfigured()) {
    throw new HeronExchangeError("Heron Auth is not enabled.", 503, "resolve", "not_configured");
  }

  if (preVerified) {
    console.info(`${LOG} preVerified=yes sub=${preVerified.sub}`);
  } else {
    console.warn(
      `${LOG} preVerified=no — re-verify JWT (old image: causes jti_replay after jwt_verify ok in route)`,
    );
  }

  const verified = preVerified ?? (await verifyHeronAccessToken(accessToken));
  if (!verified) {
    const reason = preVerified ? "resolve_reverify_failed" : "jti_replay_likely";
    console.warn(`${LOG} fail`, { step: "jwt_reverify", reason, hadPreVerified: !!preVerified });
    throw new HeronExchangeError("Invalid Heron access token.", 401, "jwt_reverify", reason);
  }

  const me = await fetchHeronMe(accessToken);
  const profile =
    me?.userId != null
      ? me
      : (() => {
          console.warn(`${LOG} profile_unavailable using jwt.sub`, { sub: verified.sub });
          return { userId: verified.sub, email: null as string | null };
        })();

  if (!heronSubMatches(profile.userId, verified.sub)) {
    console.warn(`${LOG} fail`, { step: "identity_mismatch", jwtSub: verified.sub, meUserId: profile.userId });
    throw new HeronExchangeError("Heron identity mismatch.", 401, "identity_mismatch");
  }

  const grants = await fetchHeronServiceGrants(accessToken);
  let targetRole = roleFromGrant(grants);

  let user = await prisma.user.findUnique({ where: { heronSubjectId: verified.sub } });

  if (!user) {
    const heronLinkedCount = await prisma.user.count({
      where: { heronSubjectId: { not: null } },
    });
    const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
    if (heronLinkedCount === 0 || adminCount === 0) {
      console.info("[heron_exchange] first Heron SSO login bootstraps ADMIN", {
        sub: verified.sub,
        heronLinkedCount,
        adminCount,
      });
      targetRole = UserRole.ADMIN;
    }
  }

  if (!user && profile.email && isValidEmail(profile.email)) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email.trim() } });
    if (byEmail) {
      const linkedRole =
        byEmail.role === UserRole.ADMIN ? UserRole.ADMIN : targetRole;
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { heronSubjectId: verified.sub, role: linkedRole },
      });
    }
  }

  if (!user) {
    const email =
      profile.email && isValidEmail(profile.email)
        ? profile.email.trim()
        : syntheticSsoEmail(verified.sub);
    user = await prisma.user.create({
      data: {
        email,
        heronSubjectId: verified.sub,
        role: targetRole,
        passwordHash: null,
      },
    });
  } else {
    const data: { heronSubjectId?: string; role?: UserRole } = {};
    if (!user.heronSubjectId) data.heronSubjectId = verified.sub;
    if (targetRole === UserRole.ADMIN && user.role !== UserRole.ADMIN) {
      data.role = UserRole.ADMIN;
    }
    if (Object.keys(data).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data,
      });
    }
  }

  await createUserSession(user.id);
  return { user, role: user.role };
}
