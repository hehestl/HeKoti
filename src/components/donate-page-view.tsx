"use client";

import { useEffect } from "react";
import { CopyButton } from "@/components/copy-button";
import { DonateConfigEditor } from "@/components/donate-config-editor";
import { useDonateInlineEdit } from "@/components/donate-inline-edit-context";
import type { Dictionary } from "@/lib/i18n";
import type { DonateConfig } from "@/lib/donate-config";

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

export function DonatePageView({
  initialConfig,
  dict,
}: {
  initialConfig: DonateConfig;
  dict: Dictionary;
}) {
  const d = dict.admin.donate;
  const {
    isEditing,
    draft,
    config,
    labels,
    statusText,
    statusTone,
    registerConfig,
    unregisterConfig,
    patchDraft,
    saveNow,
    cancelEdit,
  } = useDonateInlineEdit();

  useEffect(() => {
    registerConfig(initialConfig);
    return unregisterConfig;
  }, [initialConfig, registerConfig, unregisterConfig]);

  const display = config ?? initialConfig;

  if (isEditing && draft) {
    return (
      <main style={{ padding: 12 }} className="wiki-inline-edit-wrap">
        <div className="wiki-inline-edit-toolbar">
          <div className="wiki-inline-edit-toolbar-actions">
            <button type="button" className="wiki-inline-edit-btn" onClick={() => void saveNow()}>
              {labels.save}
            </button>
            <button type="button" className="wiki-inline-edit-btn wiki-inline-edit-btn-muted" onClick={cancelEdit}>
              {labels.cancel}
            </button>
          </div>
          {statusText ? (
            <span className={`wiki-inline-edit-status${statusTone === "error" ? " wiki-inline-edit-status-error" : ""}`}>
              {statusText}
            </span>
          ) : null}
        </div>
        <h1>{d.title}</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>{d.desc}</p>
        <DonateConfigEditor draft={draft} dict={d} onChange={(next) => patchDraft(next)} />
      </main>
    );
  }

  return (
    <main style={{ padding: 12 }}>
      <h1>{d.title}</h1>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>{d.desc}</p>
      <section style={panelStyle}>
        <h2>{d.platforms}</h2>
        <ul style={listStyle}>
          {display.platforms.map((item) => (
            <li key={`${item.title}:${item.url}`}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {item.title}
              </a>
            </li>
          ))}
          {display.platforms.length === 0 ? <li style={{ color: "var(--muted)" }}>{d.noPlatforms}</li> : null}
        </ul>
      </section>
      <section style={panelStyle}>
        <h2>{d.crypto}</h2>
        <ul style={listStyle}>
          {display.crypto.map((item) => (
            <li key={`${item.asset}:${item.network}:${item.address}`}>
              <strong>
                {item.asset} ({item.network})
              </strong>{" "}
              <CopyButton text={item.address} />
            </li>
          ))}
          {display.crypto.length === 0 ? <li style={{ color: "var(--muted)" }}>{d.noCrypto}</li> : null}
        </ul>
      </section>
      <section style={panelStyle}>
        <h2>{d.contacts}</h2>
        <ul style={listStyle}>
          {display.contacts.map((item) => (
            <li key={`${item.title}:${item.url}`}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {item.title}
              </a>
            </li>
          ))}
          {display.contacts.length === 0 ? <li style={{ color: "var(--muted)" }}>{d.noContacts}</li> : null}
        </ul>
      </section>
    </main>
  );
}
