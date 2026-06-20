"use client";

import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { DonateConfig } from "@/lib/donate-config";

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "6px 8px",
  width: "100%",
  fontSize: 14,
};

const btnStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--fg)",
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
};

type SectionDict = Dictionary["admin"]["donate"];

export function DonateConfigEditor({
  draft,
  dict,
  onChange,
}: {
  draft: DonateConfig;
  dict: SectionDict;
  onChange: (next: DonateConfig) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <DonateLinkSection
        title={dict.platforms}
        addLabel={dict.addPlatform}
        titleLabel={dict.fieldTitle}
        urlLabel={dict.fieldUrl}
        removeLabel={dict.removeRow}
        items={draft.platforms}
        onChange={(platforms) => onChange({ ...draft, platforms })}
      />
      <DonateCryptoSection
        title={dict.crypto}
        addLabel={dict.addCrypto}
        assetLabel={dict.fieldAsset}
        networkLabel={dict.fieldNetwork}
        addressLabel={dict.fieldAddress}
        removeLabel={dict.removeRow}
        items={draft.crypto}
        onChange={(crypto) => onChange({ ...draft, crypto })}
      />
      <DonateLinkSection
        title={dict.contacts}
        addLabel={dict.addContact}
        titleLabel={dict.fieldTitle}
        urlLabel={dict.fieldUrl}
        removeLabel={dict.removeRow}
        items={draft.contacts}
        onChange={(contacts) => onChange({ ...draft, contacts })}
      />
    </div>
  );
}

function DonateLinkSection({
  title,
  addLabel,
  titleLabel,
  urlLabel,
  removeLabel,
  items,
  onChange,
}: {
  title: string;
  addLabel: string;
  titleLabel: string;
  urlLabel: string;
  removeLabel: string;
  items: { title: string; url: string }[];
  onChange: (items: { title: string; url: string }[]) => void;
}) {
  return (
    <section style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        <button
          type="button"
          style={btnStyle}
          onClick={() => onChange([...items, { title: "", url: "https://" }])}
        >
          {addLabel}
        </button>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr auto" }}>
            <input
              style={inputStyle}
              placeholder={titleLabel}
              value={item.title}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, title: e.target.value };
                onChange(next);
              }}
            />
            <input
              style={inputStyle}
              placeholder={urlLabel}
              value={item.url}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, url: e.target.value };
                onChange(next);
              }}
            />
            <button type="button" style={btnStyle} onClick={() => onChange(items.filter((_, i) => i !== index))}>
              {removeLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DonateCryptoSection({
  title,
  addLabel,
  assetLabel,
  networkLabel,
  addressLabel,
  removeLabel,
  items,
  onChange,
}: {
  title: string;
  addLabel: string;
  assetLabel: string;
  networkLabel: string;
  addressLabel: string;
  removeLabel: string;
  items: { asset: string; network: string; address: string }[];
  onChange: (items: { asset: string; network: string; address: string }[]) => void;
}) {
  return (
    <section style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        <button
          type="button"
          style={btnStyle}
          onClick={() => onChange([...items, { asset: "", network: "", address: "" }])}
        >
          {addLabel}
        </button>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(80px, 0.5fr) minmax(100px, 0.7fr) 1fr auto" }}
          >
            <input
              style={inputStyle}
              placeholder={assetLabel}
              value={item.asset}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, asset: e.target.value };
                onChange(next);
              }}
            />
            <input
              style={inputStyle}
              placeholder={networkLabel}
              value={item.network}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, network: e.target.value };
                onChange(next);
              }}
            />
            <input
              style={inputStyle}
              placeholder={addressLabel}
              value={item.address}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, address: e.target.value };
                onChange(next);
              }}
            />
            <button type="button" style={btnStyle} onClick={() => onChange(items.filter((_, i) => i !== index))}>
              {removeLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

const panelStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 14,
  background: "var(--panel)",
  padding: 12,
};
