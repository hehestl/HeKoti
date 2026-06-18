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

  const quarter = rowHeight / 4;
  if (relativeY < quarter) return "before";
  if (relativeY > rowHeight - quarter) return "after";
  return "inside";
}

export function resolveDropPositionFromEvent(
  e: { clientY: number; currentTarget: EventTarget & { getBoundingClientRect(): DOMRect } },
  target: DropTargetKind,
): "before" | "inside" | "after" {
  const rect = e.currentTarget.getBoundingClientRect();
  return resolveDropPosition(e.clientY - rect.top, rect.height, target);
}
