// POST /api/analyze — server-side proxy + analysis (SPEC §3, DECISIONS §1).
// Runs as a Node.js serverless function (needs cheerio + full fetch control;
// not Edge). Never invents data: an unreadable page returns `unreadable`.

import { NextResponse } from "next/server";
import { fetchPage } from "@/lib/extract";
import { parse } from "@/lib/parser";
import { matchBrandByHost } from "@/lib/knowledge";
import type { AnalyzeResult, BrandMatch } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15; // Vercel function ceiling (SPEC analyzing timeout)

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
  try {
    const host = new URL(url).hostname;
    const brand = matchBrandByHost(host);
    if (brand) {
      brandMatch = { name: brand.name, noteKey: "result.brandMatch", ref: true };
    }
  } catch {
    brandMatch = null;
  }

  const result: AnalyzeResult = {
    status: "ok",
    category: parsed.category,
    categoryConfidence: parsed.categoryConfidence,
    findings: parsed.findings,
    missing: parsed.missing,
    score: parsed.score,
    wrinkle: parsed.wrinkle,
    brandMatch,
    confidence: parsed.confidence,
    ...(process.env.NODE_ENV !== "production"
      ? { rawNotes: `host=${safeHost(url)} thin=${fetched.extract.thin}` }
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
