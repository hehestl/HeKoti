import { CopyButton } from "@/components/copy-button";
import { cryptoWallets, donateLinks } from "@/lib/funding";
import { safeLang, getDictionary } from "@/lib/i18n";

export default async function DonatePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: inputLang } = await params;
  const lang = safeLang(inputLang);
  const dict = await getDictionary(lang);

  return (
    <main style={{ padding: 12 }}>
      <h1>{dict.admin.donate.title}</h1>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>
        {dict.admin.donate.desc}
      </p>
      <section style={panelStyle}>
        <h2>{dict.admin.donate.platforms}</h2>
        <ul style={listStyle}>
          {donateLinks.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {item.title}
              </a>
            </li>
          ))}
          {donateLinks.length === 0 ? <li style={{ color: "var(--muted)" }}>{dict.admin.donate.noPlatforms}</li> : null}
        </ul>
      </section>
      <section style={panelStyle}>
        <h2>{dict.admin.donate.crypto}</h2>
        <ul style={listStyle}>
          {cryptoWallets.map((item) => (
            <li key={`${item.asset}:${item.network}`}>
              <strong>
                {item.asset} ({item.network})
              </strong>{" "}
              <CopyButton text={item.address} />
            </li>
          ))}
          {cryptoWallets.length === 0 ? <li style={{ color: "var(--muted)" }}>{dict.admin.donate.noCrypto}</li> : null}
        </ul>
      </section>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 14,
  background: "var(--panel)",
  padding: 12,
  marginTop: 12,
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  display: "grid",
  gap: 8,
  padding: 0,
  marginTop: 10,
};
