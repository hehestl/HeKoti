export type DropTargetKind = {
  isCategory: boolean;
  hasChildren: boolean;
  isFolderOnly: boolean;
};

export function canDropInside(target: DropTargetKind): boolean {
  return target.isCategory || target.hasChildren || target.isFolderOnly;
}

export function resolveDropPosition(
  relativeY: number,
  rowHeight: number,
  target: DropTargetKind,
): "before" | "inside" | "after" {
  if (!canDropInside(target)) {
    return relativeY < rowHeight / 2 ? "before" : "after";
  }

  const topBand = rowHeight * 0.35;
  const bottomBand = rowHeight * 0.65;
  const nestBand = rowHeight * 0.12;
  const center = rowHeight / 2;

  if (relativeY < topBand) return "before";
  if (relativeY > bottomBand) return "after";
  if (Math.abs(relativeY - center) < nestBand) return "inside";
  return relativeY < center ? "before" : "after";
}

export function resolveDropPositionFromEvent(
  e: { clientY: number; currentTarget: EventTarget & { getBoundingClientRect(): DOMRect } },
  target: DropTargetKind,
): "before" | "inside" | "after" {
  const rect = e.currentTarget.getBoundingClientRect();
  return resolveDropPosition(e.clientY - rect.top, rect.height, target);
}
