// POST /api/analyze — server-side proxy + analysis (SPEC §3, DECISIONS §1).
// Runs as a Node.js serverless function (needs cheerio + full fetch control;
// not Edge). Never invents data: an unreadable page returns `unreadable`.

import { NextResponse } from "next/server";
import { fetchPage } from "@/lib/extract";
import { parse } from "@/lib/parser";
import { matchAuditedProduct, recommendAlternatives } from "@/lib/knowledge";
import type { AnalyzeResult, BrandMatch, ReadInfo, ReadSignal } from "@/lib/types";

export const runtime = "nodejs";
// Allows the direct fetch (~9s) plus the reader-proxy fallback (~18s) for
// blocked/JS-heavy shops. Working shops still return in 1-3s via the fast path.
export const maxDuration = 30;

// Lightweight in-memory rate limit (per-IP sliding window). Bounds casual abuse
// of the outbound-fetch endpoint at zero cost. It is per-instance and
// best-effort — production-grade limiting should use Vercel Firewall / BotID or
// a shared store (e.g. Upstash). The map is pruned so it stays bounded (OOM
// guard).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateHits = new Map<string, number[]>();

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  rateHits.set(ip, recent);
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateHits.delete(k);
    }
  }
  return recent.length > RATE_MAX;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  if (isRateLimited(clientIp(req))) {
    const result: AnalyzeResult = {
      status: "unreadable",
      reason: "rate-limited",
      messageKey: "error.unreadable",
    };
    return NextResponse.json(result, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const url = (body as { url?: unknown } | null)?.url;
  if (!isValidUrl(url)) {
    // Frontend validates first; this is a safety net.
    return NextResponse.json(
      { status: "unreadable", reason: "blocked", messageKey: "error.unreadable" },
      { status: 400 },
    );
  }

  const fetched = await fetchPage(url);
  if (!fetched.ok) {
    const result: AnalyzeResult = {
      status: "unreadable",
      reason: fetched.reason,
      messageKey: "error.unreadable",
    };
    return NextResponse.json(result, { status: 200 });
  }

  const parsed = parse(fetched.extract.text, {
    categoryHint: fetched.extract.categoryHint,
  });

  let brandMatch: BrandMatch | null = null;
  let brandName: string | undefined;
  try {
    const host = new URL(url).hostname;
    const match = matchAuditedProduct({ host, url, category: parsed.category });
    if (match) {
      brandName = match.brand.name;
      const p = match.product;
      brandMatch = {
        name: match.brand.name,
        noteKey: "result.brandMatch",
        ref: true,
        matchLevel: match.matchLevel,
        // Surface our verified reference only when a specific product is tied
        // (product/category match). `tier` is our judgment; specs are fact.
        ...(p
          ? {
              reference: {
                product: p.product,
                confidence: p.confidence,
                tier: p.tier,
                fiber: p.fiber,
                gsm: p.gsm,
                weave: p.weave,
                origin: p.origin,
                wrinkle: p.wrinkle,
              },
            }
          : {}),
      };
    }
  } catch {
    brandMatch = null;
  }

  // Audited pieces we trust in the same category (excludes the matched house so
  // we don't recommend Asket while viewing an Asket). Empty for hoodie/pullover
  // /unknown — the KB only covers tshirt/shirt.
  const recommendations = recommendAlternatives(parsed.category, {
    excludeBrand: brandName,
  });

  // P2.1 — read-confidence: which path read the page and what it yielded.
  // Reports only what was actually obtained; never fills a gap.
  const got: ReadSignal[] = [];
  if (parsed.findings.fiber.verified) got.push("fiber");
  if (parsed.findings.gsm.verified) got.push("gsm");
  if (parsed.findings.weave.verified) got.push("weave");
  if (fetched.extract.images?.length) got.push("image");
  const read: ReadInfo = {
    via: fetched.via,
    got,
    complete: got.includes("fiber") && got.includes("gsm"),
  };

  const result: AnalyzeResult = {
    status: "ok",
    category: parsed.category,
    categoryConfidence: parsed.categoryConfidence,
    findings: parsed.findings,
    missing: parsed.missing,
    score: parsed.score,
    wrinkle: parsed.wrinkle,
    brandMatch,
    recommendations,
    ...(fetched.extract.images?.length ? { images: fetched.extract.images } : {}),
    confidence: parsed.confidence,
    read,
    ...(process.env.NODE_ENV !== "production"
      ? { rawNotes: `host=${safeHost(url)} thin=${fetched.extract.thin} via=${fetched.via}` }
      : {}),
  };

  return NextResponse.json(result, { status: 200 });
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "?";
  }
}
