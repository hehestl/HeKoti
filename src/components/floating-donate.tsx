import Link from "next/link";

export function FloatingDonate({ lang }: { lang: string }) {
  return (
    <Link
      href={`/${lang}/donate`}
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: "10px 14px",
        background: "var(--panel)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        zIndex: 50,
      }}
    >
      Donate
    </Link>
  );
}
