"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";
import { useWikiInlineEditOptional } from "@/components/wiki-inline-edit-context";
import type { AdminContextMenuItem } from "@/types/admin-workbench";

export function HekotiMascotMenu({
  lang,
  isAdmin,
  appVersion,
  className,
  imageSize,
  priority,
  adminOnly = true,
  showOpenSite = false,
  openSiteLabel,
  adminLabel,
  versionLabel,
  editLabel,
  exitEditLabel,
}: {
  lang: string;
  isAdmin: boolean;
  appVersion?: string;
  className?: string;
  imageSize?: number;
  priority?: boolean;
  adminOnly?: boolean;
  showOpenSite?: boolean;
  openSiteLabel?: string;
  adminLabel: string;
  versionLabel: string;
  editLabel?: string;
  exitEditLabel?: string;
}) {
  const router = useRouter();
  const inlineEdit = useWikiInlineEditOptional();
  const [menu, setMenu] = useState<null | { x: number; y: number }>(null);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (adminOnly && !isAdmin) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [adminOnly, isAdmin],
  );

  if (adminOnly && !isAdmin) {
    return <HekotiMascotLink lang={lang} className={className} imageSize={imageSize} priority={priority} />;
  }

  const items: AdminContextMenuItem[] = [];
  if (showOpenSite) {
    items.push({ id: "site", label: openSiteLabel ?? "Site", onClick: () => router.push(`/${lang}`) });
    items.push({ id: "sep0", label: "", separator: true });
  }
  if (inlineEdit?.canEdit && editLabel && exitEditLabel) {
    if (inlineEdit.isEditing) {
      items.push({
        id: "exit-edit",
        label: exitEditLabel,
        onClick: () => inlineEdit.cancelEdit(),
      });
    } else {
      items.push({
        id: "edit",
        label: editLabel,
        onClick: () => inlineEdit.startEdit(),
      });
    }
    items.push({ id: "sep-edit", label: "", separator: true });
  }
  items.push({ id: "admin", label: adminLabel, onClick: () => router.push(`/${lang}/admin`) });
  if (appVersion) {
    items.push({ id: "sep1", label: "", separator: true });
    items.push({
      id: "version",
      label: `${versionLabel} v${appVersion}`,
      disabled: true,
      onClick: () => {
        void navigator.clipboard.writeText(appVersion);
      },
    });
  }

  return (
    <>
      <div className={className ? `${className} hekoti-mascot-menu-wrap` : "hekoti-mascot-menu-wrap"} onContextMenu={onContextMenu}>
        <HekotiMascotLink lang={lang} className="hekoti-mascot-menu-link" imageSize={imageSize} priority={priority} />
      </div>
      {menu ? (
        <AdminContextMenu
          x={menu.x}
          y={menu.y}
          items={items}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  );
}
