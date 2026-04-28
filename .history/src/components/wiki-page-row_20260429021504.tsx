"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { pathSegmentsAfterLang } from "@/lib/wiki-path";
import type { Dictionary } from "@/lib/i18n";

const menuBtn: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  border: "none",
  background: "transparent",
  color: "var(--fg)",
  cursor: "pointer",
  fontSize: 13,
  borderRadius: 6,
};

export function WikiPageRow({
  id,
  href,
  title,
  lang,
  isAdmin,
  isActive,
}: {
  id: string;
  href: string;
  title: string;
  lang: string;
  isAdmin: boolean;
  isActive: boolean;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!isAdmin) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [isAdmin],
  );

  const moveUp = async () => {
    const res = await fetch(`/api/pages/${id}/move-up`, { method: "POST", credentials: "same-origin" });
    const body = (await res.json()) as { message?: string };
    if (!res.ok) {
      alert(body.message ?? "Не удалось переместить");
      return;
    }
    setMenu(null);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm(`Удалить страницу «${title}»?`)) return;
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE", credentials: "same-origin" });
    const body = (await res.json()) as { ok?: boolean; path?: string; message?: string };
    if (!res.ok) {
      alert(body.message ?? "Удаление не удалось");
      return;
    }
    setMenu(null);
    if (body.path) {
      const segs = pathSegmentsAfterLang(body.path, lang);
      const wikiPrefix = `/${lang}/wiki`;
      const current = window.location.pathname.replace(/\/$/, "");
      const deletedPath = `${wikiPrefix}/${segs.join("/")}`.replace(/\/$/, "");
      if (current === deletedPath || current.startsWith(`${deletedPath}/`)) {
        router.push(`/${lang}`);
        return;
      }
    }
    router.refresh();
  };

  return (
    <>
      <li onContextMenu={onContextMenu}>
        <Link
          href={href}
          className={isActive ? "repo-page-link repo-page-link-active" : "repo-page-link"}
          prefetch={false}
          style={isAdmin ? { cursor: "context-menu" } : undefined}
        >
          {title}
        </Link>
      </li>
      {menu && isAdmin ? (
        <div
          role="menu"
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            zIndex: 1000,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            minWidth: 188,
            padding: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" style={menuBtn} onClick={moveUp}>
            Переместить вверх
          </button>
          <button
            type="button"
            style={{ ...menuBtn, color: "#c62828" }}
            onClick={remove}
          >
            Удалить
          </button>
        </div>
      ) : null}
    </>
  );
}
