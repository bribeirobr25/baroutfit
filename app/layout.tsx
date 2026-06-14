import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/brand";

// Three voices: Bodoni Moda (couture display), Inter (clean body), Space Mono
// (the technical underside — care labels, composition, the verdict's data).
// Self-hosted by next/font at build time (no external runtime request).
// Only the weights actually used (400 body/italic + light fallback, 600 wordmark,
// 700 score, 900 headlines/verdict) — trims the unused 500/800 from the payload.
// Bodoni Moda has no 300, so `font-light` resolves to the nearest loaded (400).
const display = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
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
  themeColor: "#0a0a0b",
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
