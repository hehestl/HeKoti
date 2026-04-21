import type { Metadata } from "next";
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
