export type DonateLink = { title: string; url: string };
export type CryptoWallet = { asset: string; network: string; address: string };
export type DonateContact = { title: string; url: string };

export type DonateConfig = {
  platforms: DonateLink[];
  crypto: CryptoWallet[];
  contacts: DonateContact[];
};

export function donateConfigEquals(a: DonateConfig, b: DonateConfig): boolean {
  return (
    JSON.stringify(a.platforms) === JSON.stringify(b.platforms) &&
    JSON.stringify(a.crypto) === JSON.stringify(b.crypto) &&
    JSON.stringify(a.contacts) === JSON.stringify(b.contacts)
  );
}
