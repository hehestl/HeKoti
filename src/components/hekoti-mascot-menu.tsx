"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminContextMenu } from "@/components/admin-workbench/admin-context-menu";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";
import { useDonateInlineEditOptional } from "@/components/donate-inline-edit-hooks";
import { useHomeInlineEditOptional } from "@/components/home-inline-edit-context";
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
  inlineEditSource = "auto",
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
  inlineEditSource?: "donate" | "auto";
}) {
  const router = useRouter();
  const donateEdit = useDonateInlineEditOptional();
  const wikiEdit = useWikiInlineEditOptional();
  const homeEdit = useHomeInlineEditOptional();
  const inlineEdit =
    inlineEditSource === "donate" && donateEdit && isAdmin
      ? donateEdit
      : donateEdit?.canEdit
        ? donateEdit
        : wikiEdit?.canEdit
          ? wikiEdit
          : homeEdit;
  const inlineEditMenuVisible =
    inlineEditSource === "donate" && donateEdit && isAdmin
      ? donateEdit.canEdit
      : !!inlineEdit?.canEdit;
  const [menu, setMenu] = useState<null | { x: number; y: number }>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const inlineEditRef = useRef(inlineEdit);
  inlineEditRef.current = inlineEdit;

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (adminOnly && !isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [adminOnly, isAdmin],
  );

  const inlineIsEditing = inlineEdit?.isEditing ?? false;

  const items = useMemo((): AdminContextMenuItem[] => {
    const edit = inlineEditRef.current;
    const menuItems: AdminContextMenuItem[] = [];
    if (showOpenSite) {
      menuItems.push({ id: "site", label: openSiteLabel ?? "Site", onClick: () => router.push(`/${lang}`) });
      menuItems.push({ id: "sep0", label: "", separator: true });
    }
    if (inlineEditMenuVisible && editLabel && exitEditLabel && edit) {
      if (inlineIsEditing) {
        menuItems.push({
          id: "exit-edit",
          label: exitEditLabel,
          onClick: () => edit.cancelEdit(),
        });
      } else {
        menuItems.push({
          id: "edit",
          label: editLabel,
          onClick: () => edit.startEdit(),
        });
      }
      menuItems.push({ id: "sep-edit", label: "", separator: true });
    }
    menuItems.push({ id: "admin", label: adminLabel, onClick: () => router.push(`/${lang}/admin`) });
    if (appVersion) {
      menuItems.push({ id: "sep1", label: "", separator: true });
      menuItems.push({
        id: "version",
        label: `${versionLabel} v${appVersion}`,
        disabled: true,
        onClick: () => {
          void navigator.clipboard.writeText(appVersion);
        },
      });
    }
    return menuItems;
  }, [
    adminLabel,
    appVersion,
    editLabel,
    exitEditLabel,
    inlineEditMenuVisible,
    inlineIsEditing,
    lang,
    openSiteLabel,
    router,
    showOpenSite,
    versionLabel,
  ]);

  if (adminOnly && !isAdmin) {
    return <HekotiMascotLink lang={lang} className={className} imageSize={imageSize} priority={priority} />;
  }

  return (
    <>
      <div
        className={className ? `${className} hekoti-mascot-menu-wrap` : "hekoti-mascot-menu-wrap"}
        onContextMenuCapture={onContextMenu}
      >
        <HekotiMascotLink lang={lang} className="hekoti-mascot-menu-link" imageSize={imageSize} priority={priority} />
      </div>
      {menu ? (
        <AdminContextMenu
          x={menu.x}
          y={menu.y}
          items={items}
          onClose={closeMenu}
          dismissOnScroll={false}
        />
      ) : null}
    </>
  );
}
