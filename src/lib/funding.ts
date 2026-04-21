import { env } from "@/lib/env";

type DonateLink = { title: string; url: string };
type CryptoWallet = { asset: string; network: string; address: string };

function parseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export const donateLinks = parseJson<DonateLink[]>(env.DONATE_LINKS_JSON, []);
export const cryptoWallets = parseJson<CryptoWallet[]>(env.CRYPTO_DONATION_JSON, []);
