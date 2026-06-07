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

const FETCH_TIMEOUT_MS = 9_000; // fast path; reader fallback gets more time
const READER_TIMEOUT_MS = 18_000; // Jina renders JS, so it is slower
const THIN_TEXT_THRESHOLD = 200; // chars of meaningful product text

// Free, keyless reader proxy: fetches + renders JS server-side from its OWN IP,
// returning clean text. Used ONLY as a fallback when the direct fetch is
// blocked (datacenter-IP anti-bot) or thin (JS-heavy SPA). Set JINA_API_KEY for
// higher rate limits. Does not defeat shops that also block the reader's IP
// (e.g. Akamai-grade) — those stay honestly `unreadable`.
const READER_BASE = "https://r.jina.ai/";

// --- Category hint from the URL path (high-signal, low-noise) ----------------
export function categoryFromUrl(url: string): CategoryResult {
  // Normalize slug separators (+, _, %20) so "t+shirt"/"t_shirt" match too.
  const p = url.toLowerCase().replace(/%20|\+|_/g, "-");
  if (/hoodie|kapuzen|capuz|con-capucha|hooded/.test(p)) return "hoodie";
  if (/sweatshirt|pullover|moletom|sudadera|crewneck|\bsweat\b/.test(p))
    return "pullover";
  if (/t-?shirt|tshirt|\btee\b|camiseta|playera/.test(p)) return "tshirt";
  if (/shirt|camisa|hemd|chemise|overshirt/.test(p)) return "shirt";
  return "unknown";
}

// --- JSON-LD Product fields --------------------------------------------------
// Only collect from Product nodes. Collecting from the whole graph would pull in
// BreadcrumbList/category names (e.g. "Denim", "Shirts") that become false
// weave/category findings.

function pushStr(out: string[], v: unknown): void {
  if (typeof v === "string" && v.trim()) out.push(v);
  else if (Array.isArray(v)) for (const x of v) pushStr(out, x);
}

function isProductType(type: unknown): boolean {
  const t = Array.isArray(type) ? type : [type];
  return t.some(
    (x) =>
      typeof x === "string" &&
      ["product", "productgroup", "individualproduct"].includes(x.toLowerCase()),
  );
}

function collectProductFields(p: Record<string, unknown>, out: string[]): void {
  pushStr(out, p.name);
  pushStr(out, p.description);
  pushStr(out, p.material);
  pushStr(out, p.category);
  // additionalProperty: [{ name, value }] — spec sheet rows.
  const ap = p.additionalProperty;
  if (Array.isArray(ap)) {
    for (const x of ap) {
      if (x && typeof x === "object") {
        pushStr(out, (x as Record<string, unknown>).name);
        pushStr(out, (x as Record<string, unknown>).value);
      }
    }
  }
}

// Walk the graph; collect ONLY from Product nodes (do not recurse into a found
// product's related-product references).
function collectFromProducts(node: unknown, out: string[], depth = 0): void {
  if (depth > 10 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectFromProducts(item, out, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (isProductType(obj["@type"])) {
    collectProductFields(obj, out);
    return;
  }
  for (const val of Object.values(obj)) collectFromProducts(val, out, depth + 1);
}

function jsonLdText($: cheerio.CheerioAPI): string {
  const chunks: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      collectFromProducts(JSON.parse(raw), chunks);
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

  // Read JSON-LD and meta BEFORE stripping <script> (JSON-LD lives in a script
  // tag). Then remove scripts and the rest of the page chrome.
  const jsonld = jsonLdText($);
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const title = $("title").first().text();

  $("script, style, noscript, svg, iframe, template").remove();

  // Strip global chrome AND related/recommended carousels before reading the
  // product containers. Related-product sections are a common source of false
  // findings (e.g. a "denim" item recommended next to a polyester shirt) —
  // attributing a neighbour's property would be inventing data (CLAUDE §1).
  $(
    [
      "nav",
      "footer",
      "header[role='banner']",
      "[class*='nav' i]",
      "[class*='footer' i]",
      "[class*='menu' i]",
      "[class*='related' i]",
      "[class*='recommend' i]",
      "[class*='carousel' i]",
      "[class*='slider' i]",
      "[class*='you-may' i]",
      "[class*='cross-sell' i]",
      "[class*='upsell' i]",
      "[class*='complete-the-look' i]",
      "[class*='also-like' i]",
      // Product cards/tiles/grids are collections of OTHER products (related
      // grids), not the main product — their composition/category must not leak.
      // NB: deliberately NOT stripping 'product-item'/'product-list' — some
      // PDP themes (Magento) use those for the MAIN product container.
      "[class*='product-card' i]",
      "[class*='productcard' i]",
      "[class*='product-tile' i]",
      "[class*='product-grid' i]",
      "[class*='product-slider' i]",
      "[class*='product-carousel' i]",
      "[id*='related' i]",
      "[id*='recommend' i]",
    ].join(", "),
  ).remove();

  // Strip link text. Product facts (composition, GSM, weave) live in
  // descriptions and spec tables, never in links; nav/category/collection/
  // related items ARE links (e.g. a "…/collections/denim" mega-menu link that
  // would otherwise be read as weave=denim). Composition is also recovered from
  // JSON-LD/meta, so dropping links does not lose it.
  $("a").remove();

  // Insert spaces between BLOCK elements so adjacent text nodes don't glue
  // together (cheerio's .text() concatenates without separators, producing e.g.
  // "35% cottonImported" which breaks composition parsing). Inline elements
  // (span) are intentionally excluded — spacing them could split inline content
  // like a number rendered across spans ("1"+"80" -> "1 80").
  $("br, p, div, li, td, th, tr, h1, h2, h3, h4, h5, section, article, dt, dd").after(
    " ",
  );

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

// Does the text contain any fabric signal worth parsing?
const FABRIC_SIGNAL_RE =
  /\d{1,3}\s*%|\bcotton\b|algod|baumwolle|\bpolyester\b|\bwool\b|\blinen\b|\bleinen\b|tencel|lyocell|\bgsm\b|g\s*\/\s*m|oz\b/i;

export function hasFabricSignal(text: string): boolean {
  return FABRIC_SIGNAL_RE.test(text);
}

async function directFetch(url: string): Promise<FetchResult> {
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

// Reader proxy returns the WHOLE page as markdown (nav, related products,
// reviews). Narrow it to the product section around the composition/material
// block so unrelated mentions (e.g. a "denim" related product) can't become
// false findings. Honesty over completeness (CLAUDE §1).
// Strong anchor: a percentage immediately followed by a REAL fiber word — this
// is the actual composition, not a stray "%" in a tracking URL or a nav label.
const COMPOSITION_PCT_RE =
  /\d{1,3}\s*%\s*(?:cotton|algod|baumwolle|polyester|poliester|\bwool\b|wolle|\blana\b|linen|linho|leinen|\blino\b|elastan|spandex|lycra|viscose|viskose|tencel|lyocell|modal|nylon|polyamid)/i;
// Weaker anchor: an explicit composition label.
const COMPOSITION_LABEL_RE =
  /composition|zusammensetzung|composici[oó]n|composi[cç][aã]o/i;

export function focusReaderText(text: string): string {
  const m = text.match(COMPOSITION_PCT_RE) ?? text.match(COMPOSITION_LABEL_RE);
  if (m && m.index != null) {
    return text.slice(Math.max(0, m.index - 400), m.index + 600);
  }
  // No anchor: the product description usually sits near the title, at the top.
  return text.slice(0, 1500);
}

// Fallback read via the reader proxy. Returns plain text (markdown), so cheerio
// is not used; the parser works on text directly.
async function fetchViaReader(url: string): Promise<ExtractResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READER_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: "text/plain" };
    const key = process.env.JINA_API_KEY;
    if (key) headers.Authorization = `Bearer ${key}`;

    const res = await fetch(`${READER_BASE}${url}`, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const raw = (await res.text()).replace(/\s+/g, " ").trim();
    if (raw.length < 40) return null;

    const text = focusReaderText(raw);
    return { text, categoryHint: categoryFromUrl(url), thin: false };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string): Promise<FetchResult> {
  const direct = await directFetch(url);

  // Fast path: a healthy direct read with real product text.
  if (direct.ok && !direct.extract.thin && hasFabricSignal(direct.extract.text)) {
    return direct;
  }

  // Fallback: blocked, thin, or no fabric signal -> try the reader proxy.
  const reader = await fetchViaReader(url);
  if (reader && hasFabricSignal(reader.text)) {
    return { ok: true, extract: reader };
  }

  // Reader didn't help. Prefer returning a (thin) direct read over a hard
  // failure so the parser can still report whatever little it found.
  if (direct.ok) return direct;
  return direct; // original unreadable reason
}
