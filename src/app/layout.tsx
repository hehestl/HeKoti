import type { Metadata } from "next";
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";
import { getCrawlerPolicy } from "@/lib/crawler-policy";
import { env } from "@/lib/env";
import { getGlobalSettings } from "@/lib/i18n";
import { clearSsrWindowPollution } from "@/lib/node-globals-guard";
import { MONACO_WORKERS_INLINE_SCRIPT } from "@/lib/monaco-workers-core";
import { getSiteMetadata } from "@/lib/site-metadata";
import { parseTelemetrySnippet } from "@/lib/telemetry-snippets";

export async function generateMetadata(): Promise<Metadata> {
  const [{ title, description }, policy] = await Promise.all([getSiteMetadata(), getCrawlerPolicy()]);
  return {
    metadataBase: new URL(env.APP_URL),
    title,
    description,
    robots: policy.metaRobots,
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
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
  clearSsrWindowPollution();
  const { headHtml, bodyHtml, wikiTreeGuideColor } = await getGlobalSettings();
  const head = parseTelemetrySnippet(headHtml);
  const body = parseTelemetrySnippet(bodyHtml);
  const headNodes = head.nodes;
  const bodyNodes = body.nodes;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MONACO_WORKERS_INLINE_SCRIPT }} />
        {wikiTreeGuideColor ? (
          <style>{`:root { --wiki-tree-guide-color: ${wikiTreeGuideColor}; }`}</style>
        ) : null}
        {headNodes.map((n, i) =>
          n.kind === "script" ? (
            <script key={`h-s-${i}`} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
          ) : n.kind === "meta" ? (
            <meta key={`h-m-${i}`} {...toReactAttrs(n.attrs)} />
          ) : n.kind === "link" ? (
            <link key={`h-l-${i}`} {...toReactAttrs(n.attrs)} />
          ) : (
            <noscript key={`h-n-${i}`} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
          ),
        )}
      </head>
      <body suppressHydrationWarning>
        <AppThemeProvider>{children}</AppThemeProvider>
        {bodyNodes.map((n, i) =>
          n.kind === "script" ? (
            <script key={`b-s-${i}`} {...toReactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />
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
