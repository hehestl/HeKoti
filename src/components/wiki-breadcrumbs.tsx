import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/wiki-collection";

export function WikiBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="wiki-breadcrumbs">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={`${crumb.label}-${i}`}
              className={`wiki-breadcrumb-item${isLast ? " wiki-breadcrumb-item-current" : ""}`}
            >
              {i > 0 ? (
                <span className="wiki-breadcrumb-sep" aria-hidden>
                  ›
                </span>
              ) : null}
              {crumb.href ? (
                <Link href={crumb.href} prefetch={false} className="wiki-breadcrumb-link">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
