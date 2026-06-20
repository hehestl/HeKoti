/** Polyfills required by mermaid@11 in Node before mermaid loads. */
if (typeof globalThis.CSSStyleSheet === "undefined") {
  globalThis.CSSStyleSheet = class CSSStyleSheet {
    cssRules: unknown[] = [];

    insertRule(rule: string, index = 0) {
      const entry = { cssText: rule };
      this.cssRules.splice(index, 0, entry);
      return index;
    }

    replaceSync(_text: string) {}

    replace(_text: string) {
      return Promise.resolve();
    }
  } as unknown as typeof CSSStyleSheet;
}
