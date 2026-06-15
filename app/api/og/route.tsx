// GET /api/og?b=&c=&w=&s=&f=&l= — dynamic Open Graph image of a verdict
// (Fase B / B3). Reads the verdict from query params (no shop re-fetch), renders
// it in the Noir identity. Used by /share's OpenGraph metadata.

import { ImageResponse } from "next/og";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CategoryResult, ScoreBand, Wrinkle } from "@/lib/types";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BANDS: ScoreBand[] = ["high", "medium", "low", "indeterminate", "out-of-scope"];
const WRINKLES: Wrinkle[] = ["low", "medium", "high", "unknown"];
const CATS: CategoryResult[] = ["tshirt", "shirt", "pullover", "hoodie", "unknown"];

function pick<T extends string>(v: string | null, allowed: T[], fallback: T): T {
  return v && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

// Brighter band variants, legible on the near-black stage.
const BAND_COLOR: Record<ScoreBand, string> = {
  high: "#46d39a",
  medium: "#ffc24b",
  low: "#ff6b5e",
  indeterminate: "#cfcabd",
  "out-of-scope": "#cfcabd",
};

export function GET(req: Request): ImageResponse {
  const q = new URL(req.url).searchParams;
  const lParam = q.get("l");
  const locale: Locale =
    lParam && (LOCALES as readonly string[]).includes(lParam)
      ? (lParam as Locale)
      : DEFAULT_LOCALE;
  const dict = DICTIONARIES[locale];

  const band = pick(q.get("b"), BANDS, "indeterminate");
  const wrinkle = pick(q.get("w"), WRINKLES, "unknown");
  const category = pick(q.get("c"), CATS, "unknown");
  const score = q.get("s");
  const fiber = (q.get("f") ?? "").slice(0, 60);
  const showScore = !!score && band !== "out-of-scope" && band !== "indeterminate";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#08080a",
          color: "#f4f1ea",
          padding: "72px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#918c81",
          }}
        >
          <span>BAR Outfit</span>
          <span>{dict.category[category]}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 800,
              color: BAND_COLOR[band],
              lineHeight: 1.05,
            }}
          >
            {dict.result.band[band]}
          </div>
          {showScore ? (
            <div style={{ display: "flex", fontSize: 44, color: "#918c81", marginTop: 14 }}>
              {score}/100
            </div>
          ) : null}
          {fiber ? (
            <div style={{ display: "flex", fontSize: 34, color: "#f4f1ea", marginTop: 18 }}>
              {fiber}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ color: "#918c81" }}>{dict.result.wrinkleQuestion}</span>
            <span style={{ color: "#f4f1ea" }}>{dict.result.wrinkle[wrinkle]}</span>
          </div>
          <span style={{ color: "#ff5a36" }}>{dict.app.footerTagline}</span>
        </div>
      </div>
    ),
    size,
  );
}
