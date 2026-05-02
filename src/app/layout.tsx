import type { Metadata } from "next";
import crypto from "crypto";
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";
import { getGlobalSettings } from "@/lib/i18n";
import { parseTelemetrySnippet } from "@/lib/telemetry-snippets";

export const metadata: Metadata = {
  title: "Hekoti",
  description: "Hekoti — self-hosted wiki knowledge archive",
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
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}' https://mc.yandex.ru https://www.googletagmanager.com https://www.google-analytics.com`,
    "img-src 'self' data: https:",
    "connect-src 'self' https://mc.yandex.ru https://www.google-analytics.com https://region1.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
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
