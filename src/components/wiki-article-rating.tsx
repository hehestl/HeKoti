"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import { apiFetch } from "@/lib/api-fetch";

type PageReaction = "BROKEN" | "NEUTRAL" | "LOVED";

type RatingDict = {
  ratingTitle: string;
  ratingThanks: string;
  ratingBroken: string;
  ratingNeutral: string;
  ratingLoved: string;
};

const REACTIONS: { key: PageReaction; emoji: string; labelKey: keyof RatingDict }[] = [
  { key: "BROKEN", emoji: "💔", labelKey: "ratingBroken" },
  { key: "NEUTRAL", emoji: "🤍", labelKey: "ratingNeutral" },
  { key: "LOVED", emoji: "❤️", labelKey: "ratingLoved" },
];

type RatingResponse = {
  userReaction: PageReaction | null;
};

export function WikiArticleRating({ pageId, dict }: { pageId: string; dict: RatingDict }) {
  const [userReaction, setUserReaction] = useState<PageReaction | null>(null);
  const [optimisticReaction, setOptimisticReaction] = useOptimistic<PageReaction | null>(userReaction);
  const [thanks, setThanks] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/pages/${pageId}/rating`, { credentials: "same-origin" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as RatingResponse;
      if (!cancelled) setUserReaction(data.userReaction);
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  const handleClick = useCallback(
    (reaction: PageReaction) => {
      const isToggleOff = optimisticReaction === reaction;
      startTransition(async () => {
        setOptimisticReaction(isToggleOff ? null : reaction);
        setThanks(false);

        const res = isToggleOff
          ? await apiFetch(`/api/pages/${pageId}/rating`, { method: "DELETE" })
          : await apiFetch(`/api/pages/${pageId}/rating`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reaction }),
            });

        if (!res.ok) {
          setOptimisticReaction(userReaction);
          return;
        }

        const data = (await res.json()) as RatingResponse;
        setUserReaction(data.userReaction);
        setOptimisticReaction(data.userReaction);
        if (!isToggleOff) setThanks(true);
      });
    },
    [optimisticReaction, pageId, setOptimisticReaction, userReaction],
  );

  return (
    <section className="wiki-article-rating" aria-labelledby="wiki-article-rating-title">
      <h2 id="wiki-article-rating-title" className="wiki-article-rating-title">
        {dict.ratingTitle}
      </h2>
      <div className="wiki-rating-buttons" role="group" aria-label={dict.ratingTitle}>
        {REACTIONS.map(({ key, emoji, labelKey }) => {
          const active = optimisticReaction === key;
          return (
            <button
              key={key}
              type="button"
              role="button"
              className={`wiki-rating-btn${active ? " wiki-rating-btn-active" : ""}`}
              aria-label={dict[labelKey]}
              aria-pressed={active}
              disabled={pending}
              onClick={() => handleClick(key)}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      {thanks ? <p className="wiki-article-rating-thanks">{dict.ratingThanks}</p> : null}
    </section>
  );
}
