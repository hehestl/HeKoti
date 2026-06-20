import "server-only";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type {
  CryptoWallet,
  DonateConfig,
  DonateContact,
  DonateLink,
} from "@/lib/donate-config-shared";

export type {
  CryptoWallet,
  DonateConfig,
  DonateContact,
  DonateLink,
} from "@/lib/donate-config-shared";

export {
  cryptoWalletSchema,
  donateConfigEquals,
  donateConfigPatchSchema,
  donateContactSchema,
  donateLinkSchema,
} from "@/lib/donate-config-shared";

function parseJsonArray<T>(input: string, fallback: T[]): T[] {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "[]") return fallback;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function envPlatforms(): DonateLink[] {
  return parseJsonArray<DonateLink>(env.DONATE_LINKS_JSON, []);
}

function envCrypto(): CryptoWallet[] {
  return parseJsonArray<CryptoWallet>(env.CRYPTO_DONATION_JSON, []);
}

function mergePlatforms(dbJson: string): DonateLink[] {
  const trimmed = dbJson.trim();
  if (!trimmed || trimmed === "[]") return envPlatforms();
  return parseJsonArray<DonateLink>(trimmed, envPlatforms());
}

function mergeCrypto(dbJson: string): CryptoWallet[] {
  const trimmed = dbJson.trim();
  if (!trimmed || trimmed === "[]") return envCrypto();
  return parseJsonArray<CryptoWallet>(trimmed, envCrypto());
}

export async function getDonateConfig(): Promise<DonateConfig> {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      return { platforms: envPlatforms(), crypto: envCrypto(), contacts: [] };
    }
    return {
      platforms: mergePlatforms(settings.donateLinksJson),
      crypto: mergeCrypto(settings.cryptoDonationJson),
      contacts: parseJsonArray<DonateContact>(settings.donateContactsJson, []),
    };
  } catch {
    return { platforms: envPlatforms(), crypto: envCrypto(), contacts: [] };
  }
}

export async function getRawDonateSettings(): Promise<{
  donateLinksJson: string;
  cryptoDonationJson: string;
  donateContactsJson: string;
}> {
  const settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
  return {
    donateLinksJson: settings?.donateLinksJson ?? "",
    cryptoDonationJson: settings?.cryptoDonationJson ?? "",
    donateContactsJson: settings?.donateContactsJson ?? "",
  };
}

export async function saveDonateConfig(config: DonateConfig): Promise<void> {
  await prisma.globalSettings.upsert({
    where: { id: "default" },
    update: {
      donateLinksJson: JSON.stringify(config.platforms),
      cryptoDonationJson: JSON.stringify(config.crypto),
      donateContactsJson: JSON.stringify(config.contacts),
    },
    create: {
      id: "default",
      donateLinksJson: JSON.stringify(config.platforms),
      cryptoDonationJson: JSON.stringify(config.crypto),
      donateContactsJson: JSON.stringify(config.contacts),
    },
  });
}
