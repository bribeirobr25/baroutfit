import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/brand";

// Atelier type system: Space Grotesk (kinetic geometric display), Inter (clean
// body/UI), Space Mono (the technical voice — data, labels, the spec sheet).
// Self-hosted by next/font at build time (no external runtime request, CSP-safe).
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
  display: "swap",
});

const DESCRIPTION =
  "You are what you wear. Most people never read it. Skip the brand story. We weigh the fabric (fiber, weight, how it wears) and tell you what it really is.";

const TITLE = `${APP_NAME} · know what you're wearing`;

export const metadata: Metadata = {
  // Resolves relative OG/Twitter image URLs (e.g. /api/og from /share) to
  // absolute ones for link unfurlers. Overridable via env for previews.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://baroutfit.vercel.app",
  ),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // lang defaults to "en"; the i18n provider sets the real value after mount.
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
