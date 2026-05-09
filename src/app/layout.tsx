import type { Metadata } from "next";
import crypto from "crypto";
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";
import { getGlobalSettings } from "@/lib/i18n";
import { parseTelemetrySnippet } from "@/lib/telemetry-snippets";

export const metadata: Metadata = {
  title: "Hekoti",
  description: "Hekoti — self-hosted wiki knowledge archive",
  icons: {
    icon: [
      { url: "/fav-wiki16.svg", sizes: "16x16", type: "image/svg+xml" },
      { url: "/fav-wiki32.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/fav-wiki48.svg", sizes: "48x48", type: "image/svg+xml" },
      { url: "/fav-wiki192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/fav-wiki512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/fav-wiki180.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Hekoti",
    description: "Self-hosted wiki knowledge archive",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hekoti",
    description: "Self-hosted wiki knowledge archive",
  },
};

function toReactAttrs(attrs: Record<string, string | boolean>) {
  const mapKey = (k: string) => {
    if (k === "crossorigin") return "crossOrigin";
    if (k === "referrerpolicy") return "referrerPolicy";
    if (k === "http-equiv") return "httpEquiv";
    return k;
  };
  return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [mapKey(k), v]));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { headHtml, bodyHtml } = await getGlobalSettings();
  const head = parseTelemetrySnippet(headHtml);
  const body = parseTelemetrySnippet(bodyHtml);
  const headNodes = head.nodes;
  const bodyNodes = body.nodes;
  const nonce = crypto.randomBytes(16).toString("base64");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://mc.yandex.ru https://www.googletagmanager.com https://www.google-analytics.com`,
    "img-src 'self' data: https:",
    "connect-src 'self' https://mc.yandex.ru https://www.google-analytics.com https://region1.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        {headNodes.map((n, i) =>
          n.kind === "script" ? (
            <script key={`h-s-${i}`} nonce={nonce} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
          ) : n.kind === "meta" ? (
            <meta key={`h-m-${i}`} {...toReactAttrs(n.attrs)} />
          ) : n.kind === "link" ? (
            <link key={`h-l-${i}`} {...toReactAttrs(n.attrs)} />
          ) : (
            <noscript key={`h-n-${i}`} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
          ),
        )}
      </head>
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
        {bodyNodes.map((n, i) =>
          n.kind === "script" ? (
            <script key={`b-s-${i}`} nonce={nonce} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
          ) : n.kind === "meta" ? (
            <meta key={`b-m-${i}`} {...toReactAttrs(n.attrs)} />
          ) : n.kind === "link" ? (
            <link key={`b-l-${i}`} {...toReactAttrs(n.attrs)} />
          ) : (
            <noscript key={`b-n-${i}`} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
          ),
        )}
      </body>
    </html>
  );
}
