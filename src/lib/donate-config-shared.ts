import { z } from "zod";

export type DonateLink = { title: string; url: string };
export type CryptoWallet = { asset: string; network: string; address: string };
export type DonateContact = { title: string; url: string };

export type DonateConfig = {
  platforms: DonateLink[];
  crypto: CryptoWallet[];
  contacts: DonateContact[];
};

const MAX_ITEMS = 20;

const donateUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (url) =>
      url.startsWith("https://") ||
      url.startsWith("http://") ||
      url.startsWith("mailto:") ||
      url.startsWith("tg:"),
    { message: "URL must start with https://, http://, mailto:, or tg:" },
  );

export const donateLinkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  url: donateUrlSchema,
});

export const cryptoWalletSchema = z.object({
  asset: z.string().trim().min(1).max(32),
  network: z.string().trim().min(1).max(64),
  address: z.string().trim().min(1).max(256),
});

export const donateContactSchema = donateLinkSchema;

export const donateConfigPatchSchema = z.object({
  platforms: z.array(donateLinkSchema).max(MAX_ITEMS).optional(),
  crypto: z.array(cryptoWalletSchema).max(MAX_ITEMS).optional(),
  contacts: z.array(donateContactSchema).max(MAX_ITEMS).optional(),
});

export function donateConfigEquals(a: DonateConfig, b: DonateConfig): boolean {
  return (
    JSON.stringify(a.platforms) === JSON.stringify(b.platforms) &&
    JSON.stringify(a.crypto) === JSON.stringify(b.crypto) &&
    JSON.stringify(a.contacts) === JSON.stringify(b.contacts)
  );
}
