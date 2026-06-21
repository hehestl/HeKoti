"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#0f1115",
          color: "#e8eaed",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#9aa0a6", marginBottom: 20 }}>
            A critical error occurred. Please try again or reload the page.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#5b8def",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/en"
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #3c4043",
                color: "#e8eaed",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
