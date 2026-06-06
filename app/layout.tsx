import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/brand";

// Editorial display serif + legible body sans (DECISIONS §5.2). Self-hosted by
// next/font at build time (no external runtime request).
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const DESCRIPTION =
  "Paste a clothing product link. We read the fabric and tell you if it's actually good — and whether it wrinkles.";

export const metadata: Metadata = {
  title: `${APP_NAME} — is this fabric actually good?`,
  description: DESCRIPTION,
  openGraph: {
    title: `${APP_NAME} — is this fabric actually good?`,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} — is this fabric actually good?`,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f4ef",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // lang defaults to "en"; the i18n provider sets the real value after mount.
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
