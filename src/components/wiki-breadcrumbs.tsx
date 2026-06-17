import Link from "next/link";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/lib/wiki-collection";
import { env } from "@/lib/env";

export function WikiBreadcrumbs({ items, pagePath }: { items: BreadcrumbItem[]; pagePath: string }) {
  if (items.length === 0) return null;

  const jsonLd = buildBreadcrumbJsonLd(items, pagePath, env.APP_URL);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </>
  );
}
