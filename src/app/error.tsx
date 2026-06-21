"use client";

import { WikiErrorView } from "@/components/wiki-error-view";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "40px auto" }}>
      <WikiErrorView
        lang="en"
        title="Something went wrong"
        description="An unexpected error occurred. You can try again or return home."
        backHomeLabel="Back to home"
        backHomeHref="/en"
        retryLabel="Try again"
        onRetry={reset}
      />
    </main>
  );
}
