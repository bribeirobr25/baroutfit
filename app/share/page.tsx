// /share — a shareable, server-rendered verdict (Fase B / B3). The verdict is
// read from query params (encoded by the result's Share button), so this page
// never re-fetches the shop: no SSRF/cost surface, just a render. Its OpenGraph
// image points at /api/og with the same params, so links unfurl as the verdict.

import type { Metadata } from "next";
import Link from "next/link";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CategoryResult, ScoreBand, Wrinkle } from "@/lib/types";
import { APP_NAME } from "@/lib/brand";

type SP = { [k: string]: string | string[] | undefined };

const BANDS: ScoreBand[] = ["high", "medium", "low", "indeterminate", "out-of-scope"];
const WRINKLES: Wrinkle[] = ["low", "medium", "high", "unknown"];
const CATS: CategoryResult[] = ["tshirt", "shirt", "pullover", "hoodie", "unknown"];

function one(v: string | string[] | undefined): string | null {
  return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;
}

function pick<T extends string>(v: string | null, allowed: T[], fallback: T): T {
  return v && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function parse(sp: SP) {
  const lParam = one(sp.l);
  const locale: Locale =
    lParam && (LOCALES as readonly string[]).includes(lParam)
      ? (lParam as Locale)
      : DEFAULT_LOCALE;
  const band = pick(one(sp.b), BANDS, "indeterminate");
  const wrinkle = pick(one(sp.w), WRINKLES, "unknown");
  const category = pick(one(sp.c), CATS, "unknown");
  const score = one(sp.s);
  const fiber = (one(sp.f) ?? "").slice(0, 60);
  const showScore =
    !!score && band !== "out-of-scope" && band !== "indeterminate";

  const qs = new URLSearchParams();
  qs.set("b", band);
  qs.set("c", category);
  qs.set("w", wrinkle);
  if (showScore) qs.set("s", score as string);
  if (fiber) qs.set("f", fiber);
  qs.set("l", locale);

  return {
    dict: DICTIONARIES[locale],
    band,
    wrinkle,
    category,
    score,
    fiber,
    showScore,
    qs: qs.toString(),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const { dict, band, qs } = parse(await searchParams);
  const title = `${APP_NAME} · ${dict.result.band[band]}`;
  const image = `/api/og?${qs}`;
  return {
    title,
    description: dict.app.tagline,
    openGraph: {
      title,
      description: dict.app.tagline,
      type: "website",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { dict, band, wrinkle, category, score, fiber, showScore } = parse(
    await searchParams,
  );

  const BAND_TEXT: Record<ScoreBand, string> = {
    high: "text-good",
    medium: "text-warn",
    low: "text-bad",
    indeterminate: "text-indeterminate",
    "out-of-scope": "text-indeterminate",
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-between px-5 py-10 sm:px-8">
      <header className="font-display text-xl font-semibold tracking-tight">
        {APP_NAME}
        <span className="text-accent">.</span>
      </header>

      <section className="py-10">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
          {dict.result.reportLabel} · {dict.category[category]}
        </p>
        <h1
          className={`mt-4 font-display text-5xl font-black leading-[0.95] sm:text-7xl ${BAND_TEXT[band]}`}
        >
          {dict.result.band[band]}
        </h1>
        {showScore && (
          <p className="mt-4 font-mono text-2xl text-muted">{score}/100</p>
        )}
        {fiber && <p className="mt-4 text-lg text-ink">{fiber}</p>}
        <p className="mt-6 font-mono text-sm uppercase tracking-[0.16em] text-muted">
          {dict.result.wrinkleQuestion}{" "}
          <span className="text-ink">{dict.result.wrinkle[wrinkle]}</span>
        </p>
      </section>

      <footer className="flex flex-col gap-4 border-t border-line pt-6">
        <p className="text-muted">{dict.app.tagline}</p>
        <Link
          href="/"
          className="self-start rounded-full bg-accent px-7 py-4 font-semibold text-accent-ink transition-transform hover:scale-[1.02]"
        >
          {dict.input.button}
        </Link>
      </footer>
    </main>
  );
}
