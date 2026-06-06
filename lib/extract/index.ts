// HTML extraction (DECISIONS §5.3). Server-side fetch (solves CORS) + cheerio.
// No headless browser (free-tier constraint). The goal is to feed the parser
// the product's composition/spec text; nav/footer noise is stripped, and a
// category hint is derived from the URL and JSON-LD.

import * as cheerio from "cheerio";
import type { CategoryResult, UnreadableReason } from "@/lib/types";

export interface ExtractResult {
  text: string;
  categoryHint: CategoryResult;
  thin: boolean; // true when too little product text was found (likely SPA)
}

export type FetchResult =
  | { ok: true; extract: ExtractResult }
  | { ok: false; reason: UnreadableReason };

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// A fuller browser-like header set. Many shops reject requests missing the
// modern fetch-metadata / client-hint headers; sending them legitimately
// mirrors a real navigation to a public product page (DECISIONS §4). It does
// NOT defeat datacenter-IP / TLS-fingerprint anti-bot (Akamai-grade), which
// stays correctly reported as `anti-bot`.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,de;q=0.8,pt;q=0.7,es;q=0.6",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

const FETCH_TIMEOUT_MS = 12_000;
const THIN_TEXT_THRESHOLD = 200; // chars of meaningful product text

// --- Category hint from the URL path (high-signal, low-noise) ----------------
export function categoryFromUrl(url: string): CategoryResult {
  const p = url.toLowerCase();
  if (/hoodie|kapuzen|capuz|con-capucha|hooded/.test(p)) return "hoodie";
  if (/sweatshirt|pullover|moletom|sudadera|crewneck|\bsweat\b/.test(p))
    return "pullover";
  if (/t-?shirt|tshirt|\btee\b|camiseta|playera/.test(p)) return "tshirt";
  if (/shirt|camisa|hemd|chemise|overshirt/.test(p)) return "shirt";
  return "unknown";
}

// --- JSON-LD Product fields --------------------------------------------------
const JSONLD_KEYS = new Set([
  "name",
  "description",
  "material",
  "category",
  "value",
]);

function collectJsonLdStrings(node: unknown, out: string[], depth = 0): void {
  if (depth > 8 || node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdStrings(item, out, depth + 1);
    return;
  }
  if (typeof node === "object") {
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      if (JSONLD_KEYS.has(key) && typeof val === "string") out.push(val);
      else collectJsonLdStrings(val, out, depth + 1);
    }
  }
}

function jsonLdText($: cheerio.CheerioAPI): string {
  const chunks: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const data = JSON.parse(raw);
      collectJsonLdStrings(data, chunks);
    } catch {
      // malformed JSON-LD — ignore, never throw on a single shop's quirk
    }
  });
  return chunks.join(". ");
}

const PRODUCT_SELECTORS = [
  "h1",
  '[itemprop="description"]',
  '[class*="product" i]',
  '[id*="product" i]',
  '[class*="description" i]',
  '[class*="composition" i]',
  '[class*="material" i]',
  '[class*="detail" i]',
  '[class*="spec" i]',
  '[class*="fabric" i]',
  "dl",
  "table",
].join(", ");

// Pure extraction — no network. Tested directly in Phase 3 tests.
export function extractText(html: string, url: string): ExtractResult {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, template").remove();

  const jsonld = jsonLdText($);
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const title = $("title").first().text();

  // Strip global chrome before reading product containers.
  $("nav, footer, header[role='banner'], [class*='nav' i], [class*='footer' i], [class*='menu' i]").remove();

  const containerParts: string[] = [];
  $(PRODUCT_SELECTORS).each((_, el) => {
    const t = $(el).text();
    if (t) containerParts.push(t);
  });

  let text = [title, ogTitle, metaDesc, jsonld, ...containerParts]
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();

  // If product-focused text is thin, fall back to the whole body (accepts some
  // noise so composition/GSM can still be found).
  const productLen = text.length;
  if (productLen < THIN_TEXT_THRESHOLD) {
    const body = $("body").text().replace(/\s+/g, " ").trim();
    text = `${text} ${body}`.trim();
  }

  // JSON-LD/category hint: URL first (cleanest), then JSON-LD category text.
  let categoryHint = categoryFromUrl(url);
  if (categoryHint === "unknown") categoryHint = categoryFromUrl(jsonld);

  return {
    text,
    categoryHint,
    thin: productLen < THIN_TEXT_THRESHOLD,
  };
}

function reasonForStatus(status: number): UnreadableReason | null {
  if (status === 404 || status === 410) return "not-found";
  if (status === 403 || status === 429 || status === 503) return "anti-bot";
  if (status >= 400) return "blocked";
  return null;
}

export async function fetchPage(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });

    const statusReason = reasonForStatus(res.status);
    if (statusReason) return { ok: false, reason: statusReason };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return { ok: false, reason: "blocked" };

    const html = await res.text();
    const extract = extractText(html, url);

    // A near-empty page with no usable text -> likely JS-heavy SPA.
    if (extract.text.length < 40) return { ok: false, reason: "js-heavy" };

    return { ok: true, extract };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "blocked" };
  } finally {
    clearTimeout(timer);
  }
}
