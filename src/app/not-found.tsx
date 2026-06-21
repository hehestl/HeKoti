import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "40px auto" }}>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <Link href="/en">Go to home</Link>
      </p>
    </main>
  );
}
