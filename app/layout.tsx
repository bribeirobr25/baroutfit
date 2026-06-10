import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/brand";

// Three voices: Bodoni Moda (couture display), Inter (clean body), Space Mono
// (the technical underside — care labels, composition, the verdict's data).
// Self-hosted by next/font at build time (no external runtime request).
const display = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
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
  "Anyone can dress. Few know what they're wearing. Forget the price, forget the brand. We read the cloth (fiber, weight, how it wears) and tell you the truth the price tag won't.";

export const metadata: Metadata = {
  title: `${APP_NAME} · read the cloth, not the label`,
  description: DESCRIPTION,
  openGraph: {
    title: `${APP_NAME} · read the cloth, not the label`,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} · read the cloth, not the label`,
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
