import { CopyButton } from "@/components/copy-button";
import { cryptoWallets, donateLinks } from "@/lib/funding";

export default function DonatePage() {
  return (
    <main style={{ padding: 12 }}>
      <h1>Support Hekoti</h1>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>
        Donation methods are configured from environment variables.
      </p>
      <section style={panelStyle}>
        <h2>Platforms</h2>
        <ul style={listStyle}>
          {donateLinks.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {item.title}
              </a>
            </li>
          ))}
          {donateLinks.length === 0 ? <li style={{ color: "var(--muted)" }}>No platform links configured.</li> : null}
        </ul>
      </section>
      <section style={panelStyle}>
        <h2>Crypto wallets</h2>
        <ul style={listStyle}>
          {cryptoWallets.map((item) => (
            <li key={`${item.asset}:${item.network}`}>
              <strong>
                {item.asset} ({item.network})
              </strong>{" "}
              <CopyButton text={item.address} />
            </li>
          ))}
          {cryptoWallets.length === 0 ? <li style={{ color: "var(--muted)" }}>No wallets configured.</li> : null}
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
