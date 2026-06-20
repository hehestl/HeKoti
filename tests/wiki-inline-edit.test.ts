import { describe, expect, it } from "vitest";
import type { EditableWikiPage } from "@/components/wiki-inline-edit-types";
import {
  mergeDraftAfterSave,
  pageDraftEquals,
  shouldClearDraftOnUnregister,
} from "@/hooks/use-wiki-inline-save";

function samplePage(overrides: Partial<EditableWikiPage> = {}): EditableWikiPage {
  return {
    id: "p1",
    lang: "en",
    title: "Title",
    contentMd: "Body",
    path: "/en/wiki/test",
    systemKey: null,
    isPublished: true,
    showToc: false,
    ...overrides,
  };
}

describe("shouldClearDraftOnUnregister", () => {
  it("clears draft only when not editing", () => {
    expect(shouldClearDraftOnUnregister(false)).toBe(true);
    expect(shouldClearDraftOnUnregister(true)).toBe(false);
  });
});

describe("mergeDraftAfterSave", () => {
  it("applies saved draft when user did not change content during PATCH", () => {
    const snapshot = samplePage({ title: "A", contentMd: "x" });
    const saved = samplePage({ title: "A saved", contentMd: "x" });
    const current = { ...snapshot };
    expect(mergeDraftAfterSave(current, snapshot, saved)).toEqual(saved);
  });

  it("keeps in-flight edits when draft diverged during PATCH", () => {
    const snapshot = samplePage({ contentMd: "hello" });
    const saved = samplePage({ contentMd: "hello" });
    const current = samplePage({ contentMd: "hello!" });
    expect(mergeDraftAfterSave(current, snapshot, saved)).toEqual(current);
    expect(pageDraftEquals(current, snapshot)).toBe(false);
  });
});

describe("inline edit lifecycle (stale unregister guard)", () => {
  it("simulates startEdit: draft survives unregister while isEditing", () => {
    const page = samplePage();
    let draft: EditableWikiPage | null = { ...page };
    const isEditing = true;

    if (shouldClearDraftOnUnregister(isEditing)) {
      draft = null;
    }

    expect(draft).toEqual(page);
  });

  it("clears draft on unregister when not editing", () => {
    let draft: EditableWikiPage | null = samplePage();
    const isEditing = false;

    if (shouldClearDraftOnUnregister(isEditing)) draft = null;

    expect(draft).toBeNull();
  });
});
