"use client";

import Link from "next/link";
import { HekotiMascotLink } from "@/components/hekoti-mascot-link";

export function WikiErrorView({
  lang,
  title,
  description,
  backHomeLabel,
  backHomeHref,
  retryLabel,
  onRetry,
}: {
  lang: string;
  title: string;
  description: string;
  backHomeLabel: string;
  backHomeHref: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <article className="wiki-missing-page">
      <div className="wiki-missing-page-mascot">
        <HekotiMascotLink lang={lang} className="wiki-missing-mascot" imageSize={72} />
      </div>
      <h1>{title}</h1>
      <p className="wiki-missing-page-desc">{description}</p>
      <div className="wiki-search-results-empty-actions">
        <Link href={backHomeHref}>{backHomeLabel}</Link>
        {onRetry && retryLabel ? (
          <button type="button" className="wiki-error-retry-btn" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
