"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pickNextTitle,
  reducedRotateDelayMs,
  TYPEWRITER_DELETE_MS,
  TYPEWRITER_PAUSE_MS,
  typingDelayMs,
} from "@/lib/typewriter-placeholder";

type Phase = "typing" | "pause" | "deleting";

export function useTypewriterPlaceholder({
  titles,
  enabled,
}: {
  titles: string[];
  enabled: boolean;
}) {
  const [displayText, setDisplayText] = useState("");
  const [showCaret, setShowCaret] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullTitleRef = useRef("");
  const previousTitleRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>("typing");
  const charIndexRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimer();
    fullTitleRef.current = "";
    previousTitleRef.current = null;
    phaseRef.current = "typing";
    charIndexRef.current = 0;
    setDisplayText("");
    setShowCaret(false);
  }, [clearTimer]);

  const schedule = useCallback(
    (fn: () => void, ms: number) => {
      clearTimer();
      timeoutRef.current = setTimeout(fn, ms);
    },
    [clearTimer],
  );

  const startNextTitle = useCallback(() => {
    const next = pickNextTitle(titles, previousTitleRef.current);
    previousTitleRef.current = next;
    fullTitleRef.current = next;
    phaseRef.current = "typing";
    charIndexRef.current = 0;
    setDisplayText("");
    setShowCaret(true);
  }, [titles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled || titles.length === 0) {
      resetState();
      return;
    }

    if (reducedMotion) {
      clearTimer();
      phaseRef.current = "typing";
      const showReduced = () => {
        const next = pickNextTitle(titles, previousTitleRef.current);
        previousTitleRef.current = next;
        fullTitleRef.current = next;
        setDisplayText(next);
        setShowCaret(false);
        schedule(showReduced, reducedRotateDelayMs());
      };
      showReduced();
      return () => clearTimer();
    }

    const tick = () => {
      const full = fullTitleRef.current;
      const phase = phaseRef.current;

      if (phase === "typing") {
        const nextIndex = charIndexRef.current + 1;
        charIndexRef.current = nextIndex;
        setDisplayText(full.slice(0, nextIndex));
        if (nextIndex >= full.length) {
          phaseRef.current = "pause";
          schedule(tick, TYPEWRITER_PAUSE_MS);
          return;
        }
        schedule(tick, typingDelayMs());
        return;
      }

      if (phase === "pause") {
        phaseRef.current = "deleting";
        schedule(tick, TYPEWRITER_DELETE_MS);
        return;
      }

      const nextIndex = charIndexRef.current - 1;
      charIndexRef.current = nextIndex;
      setDisplayText(full.slice(0, nextIndex));
      if (nextIndex <= 0) {
        startNextTitle();
        schedule(tick, typingDelayMs());
        return;
      }
      schedule(tick, TYPEWRITER_DELETE_MS);
    };

    startNextTitle();
    schedule(tick, typingDelayMs());

    return () => {
      clearTimer();
    };
  }, [clearTimer, enabled, reducedMotion, resetState, schedule, startNextTitle, titles]);

  return { displayText, showCaret: showCaret && !reducedMotion };
}
