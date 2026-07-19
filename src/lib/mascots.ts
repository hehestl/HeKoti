export type MascotId = "hekoti" | "hehel";

export type MascotOption = {
  id: MascotId;
  labelKey: "hekoti" | "hehel";
  src: string;
};

export const MASCOT_OPTIONS: readonly MascotOption[] = [
  { id: "hekoti", labelKey: "hekoti", src: "/hekoti.png" },
  { id: "hehel", labelKey: "hehel", src: "/mascots/hehel.png" },
] as const;

export const DEFAULT_MASCOT_ID: MascotId = "hekoti";

const mascotById = new Map(MASCOT_OPTIONS.map((m) => [m.id, m]));

export function isMascotId(value: string): value is MascotId {
  return mascotById.has(value as MascotId);
}

export function resolveMascotId(raw: string | null | undefined): MascotId {
  if (raw === "magnific") return "hehel";
  if (raw && isMascotId(raw)) return raw;
  return DEFAULT_MASCOT_ID;
}

export function resolveMascotSrc(id: MascotId): string {
  return mascotById.get(id)?.src ?? MASCOT_OPTIONS[0].src;
}
