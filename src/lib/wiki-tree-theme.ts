const HEX_COLOR_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

export function isValidWikiTreeGuideColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

export function normalizeWikiTreeGuideColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isValidWikiTreeGuideColor(trimmed) ? trimmed : null;
}
