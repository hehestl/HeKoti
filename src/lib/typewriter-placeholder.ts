export function pickNextTitle(titles: string[], previous: string | null): string {
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0]!;
  const filtered = previous ? titles.filter((t) => t !== previous) : titles;
  const pool = filtered.length > 0 ? filtered : titles;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function typingDelayMs(): number {
  return 45 + Math.random() * 15;
}

export const TYPEWRITER_DELETE_MS = 25;
export const TYPEWRITER_PAUSE_MS = 1200;
export const REDUCED_ROTATE_MIN_MS = 4000;
export const REDUCED_ROTATE_MAX_MS = 5000;

export function reducedRotateDelayMs(): number {
  return REDUCED_ROTATE_MIN_MS + Math.random() * (REDUCED_ROTATE_MAX_MS - REDUCED_ROTATE_MIN_MS);
}
