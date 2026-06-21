"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  useAdminWikiPageSearch,
  type AdminWikiPageSearchItem,
} from "@/hooks/use-admin-wiki-page-search";

export type AdminWikiLinkFormat = "markdown" | "post";

export type AdminWikiLinkPickerLabels = {
  searchPlaceholder: string;
  formatMarkdown: string;
  formatPost: string;
  labelField: string;
  noResults: string;
  loading: string;
  draftBadge: string;
};

export function AdminWikiLinkPicker({
  lang,
  labels,
  format,
  onFormatChange,
  label,
  onLabelChange,
  onSelect,
}: {
  lang: string;
  labels: AdminWikiLinkPickerLabels;
  format: AdminWikiLinkFormat;
  onFormatChange: (format: AdminWikiLinkFormat) => void;
  label: string;
  onLabelChange: (label: string) => void;
  onSelect: (item: AdminWikiPageSearchItem) => void;
}) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items, state } = useAdminWikiPageSearch(lang, query, true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(items.length > 0 ? 0 : -1);
  }, [items]);

  const pick = useCallback(
    (item: AdminWikiPageSearchItem) => {
      onSelect(item);
    },
    [onSelect],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length === 0) return;
      setActiveIndex((i) => (i + 1) % items.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) return;
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      pick(items[activeIndex]!);
    }
  };

  return (
    <div className="admin-wiki-link-picker">
      <div className="admin-wiki-link-picker-formats" role="radiogroup">
        <label className="admin-wiki-link-picker-format">
          <input
            type="radio"
            name="link-format"
            checked={format === "markdown"}
            onChange={() => onFormatChange("markdown")}
          />
          {labels.formatMarkdown}
        </label>
        <label className="admin-wiki-link-picker-format">
          <input
            type="radio"
            name="link-format"
            checked={format === "post"}
            onChange={() => onFormatChange("post")}
          />
          {labels.formatPost}
        </label>
      </div>
      <input
        ref={inputRef}
        className="admin-wiki-link-picker-search"
        type="search"
        value={query}
        placeholder={labels.searchPlaceholder}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />
      {format === "markdown" ? (
        <input
          className="admin-wiki-link-picker-label"
          type="text"
          value={label}
          placeholder={labels.labelField}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      ) : null}
      <div className="admin-wiki-link-picker-results" id={listboxId} role="listbox">
        {state === "loading" ? (
          <p className="admin-wiki-link-picker-hint">{labels.loading}</p>
        ) : null}
        {state === "empty" && query.trim().length >= 2 ? (
          <p className="admin-wiki-link-picker-hint">{labels.noResults}</p>
        ) : null}
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            className={`admin-wiki-link-picker-item${index === activeIndex ? " is-active" : ""}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => pick(item)}
          >
            <span className="admin-wiki-link-picker-item-title">
              {item.title}
              {!item.isPublished ? (
                <span className="admin-wiki-link-picker-draft">{labels.draftBadge}</span>
              ) : null}
            </span>
            {item.snippet ? <span className="admin-wiki-link-picker-item-snippet">{item.snippet}</span> : null}
            <span className="admin-wiki-link-picker-item-path">{item.pathTail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
