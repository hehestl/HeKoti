import { env } from "@/lib/env";

export type { CryptoWallet, DonateContact, DonateConfig, DonateLink } from "@/lib/donate-config";

type DonateLink = { title: string; url: string };
type CryptoWallet = { asset: string; network: string; address: string };

function parseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

/** @deprecated Use getDonateConfig() — env-only snapshot for legacy imports. */
export const donateLinks = parseJson<DonateLink[]>(env.DONATE_LINKS_JSON, []);

/** @deprecated Use getDonateConfig() — env-only snapshot for legacy imports. */
export const cryptoWallets = parseJson<CryptoWallet[]>(env.CRYPTO_DONATION_JSON, []);
