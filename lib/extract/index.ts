// HTML extraction (DECISIONS §5.3). Server-side fetch (solves CORS) + cheerio.
// No headless browser (free-tier constraint). The goal is to feed the parser
// the product's composition/spec text; nav/footer noise is stripped, and a
// category hint is derived from the URL and JSON-LD.

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import type { CategoryResult, ReadVia, UnreadableReason } from "@/lib/types";

export interface ExtractResult {
  text: string;
  categoryHint: CategoryResult;
  thin: boolean; // true when too little product text was found (likely SPA)
  images?: string[]; // product image URLs (JSON-LD gallery / og / twitter), capped
}

// `via` records WHICH path produced the read (direct HTML vs reader proxy). It
// is a property of the fetch, not of pure extraction, so it lives here and is
// surfaced as part of the P2.1 read-confidence signal.
export type FetchResult =
  | { ok: true; extract: ExtractResult; via: ReadVia }
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

// image can be a string, an array, or an ImageObject ({ url }).
function pushImg(out: string[], v: unknown): void {
  if (typeof v === "string" && v.trim()) out.push(v.trim());
  else if (Array.isArray(v)) for (const x of v) pushImg(out, x);
  else if (v && typeof v === "object") {
    const u = (v as Record<string, unknown>).url;
    if (typeof u === "string" && u.trim()) out.push(u.trim());
  }
}

function collectProductFields(
  p: Record<string, unknown>,
  out: string[],
  images: string[],
): void {
  pushStr(out, p.name);
  pushStr(out, p.description);
  pushStr(out, p.material);
  pushStr(out, p.category);
  pushImg(images, p.image);
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
function collectFromProducts(
  node: unknown,
  out: string[],
  images: string[],
  depth = 0,
): void {
  if (depth > 10 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectFromProducts(item, out, images, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (isProductType(obj["@type"])) {
    collectProductFields(obj, out, images);
    return;
  }
  for (const val of Object.values(obj))
    collectFromProducts(val, out, images, depth + 1);
}

function jsonLdNodes($: cheerio.CheerioAPI): { text: string; images: string[] } {
  const chunks: string[] = [];
  const images: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      collectFromProducts(JSON.parse(raw), chunks, images);
    } catch {
      // malformed JSON-LD — ignore, never throw on a single shop's quirk
    }
  });
  return { text: chunks.join(". "), images };
}

// --- Embedded product JSON (B) ----------------------------------------------
// Many PDPs ship the composition in a JSON island (<script type="application/
// json">, __NEXT_DATA__) rather than visible HTML/JSON-LD. We do NOT dump the
// whole blob (a SPA state can hold many products -> a neighbour's fabric =
// invented data). Instead we collect only the string VALUES of material-ish
// keys; the parser's prose-rejection + dedup still apply.
const MATERIAL_KEY_RE =
  /composition|composiz|material|mati[eè]re|fabric|fibre|fiber|stoff|tessuto|zusammensetzung|composic|materia|tecid/i;

// Spec-row shape: { name/label: "Material", value/text: "100% linen" } — the
// material word is the sibling LABEL, not the key, so the key-only walk misses
// it (a common 'no material' cause). Mirrors JSON-LD additionalProperty.
const SPEC_LABEL_KEYS = ["name", "label", "title", "key", "attributename"];
const SPEC_VALUE_KEYS = ["value", "values", "text", "content", "attributevalue"];

function pushSpecValue(out: string[], v: unknown): void {
  if (typeof v === "string" && v.trim()) out.push(v);
  else if (Array.isArray(v))
    for (const x of v) if (typeof x === "string" && x.trim()) out.push(x);
}

function collectMaterialValues(node: unknown, out: string[], depth = 0): void {
  if (depth > 12 || node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) collectMaterialValues(x, out, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;

  // Spec-row: a label field naming "material"/"composition" gates its value
  // sibling. Conservative — requires the explicit material label, so a generic
  // { name, value } pair (e.g. Fit/Regular) is not collected. Stays within the
  // already-parsed JSON islands; inline state blobs (__NUXT__) remain deferred
  // (#P2-B) precisely because they aren't scoped to the viewed product.
  const lowered = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) lowered.set(k.toLowerCase(), v);
  const labelKey = SPEC_LABEL_KEYS.find((lk) => typeof lowered.get(lk) === "string");
  const label = labelKey ? (lowered.get(labelKey) as string) : undefined;
  if (label && MATERIAL_KEY_RE.test(label)) {
    for (const vk of SPEC_VALUE_KEYS) pushSpecValue(out, lowered.get(vk));
  }

  for (const [k, v] of Object.entries(obj)) {
    if (MATERIAL_KEY_RE.test(k) && typeof v === "string" && v.trim()) out.push(v);
    collectMaterialValues(v, out, depth + 1);
  }
}

function embeddedJsonText($: cheerio.CheerioAPI): string {
  const out: string[] = [];
  $('script[type="application/json"], script#__NEXT_DATA__').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim() || raw.length > 2_000_000) return; // skip empty/huge blobs
    try {
      collectMaterialValues(JSON.parse(raw), out);
    } catch {
      // not valid JSON — ignore
    }
  });
  // Dedup so a repeated value doesn't dominate; cap to bound noise.
  return [...new Set(out)].slice(0, 12).join(". ");
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
  const { text: jsonld, images: jsonldImages } = jsonLdNodes($);
  const embedded = embeddedJsonText($); // composition from JSON islands (B)
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  // Image candidates, before stripping (gallery <a>/<img> get removed below).
  // Priority: JSON-LD gallery (usually ordered) -> og -> twitter -> image_src.
  const ogImages = $('meta[property="og:image"], meta[property="og:image:url"]')
    .map((_, el) => $(el).attr("content") ?? "")
    .get();
  const twImages = $('meta[name="twitter:image"], meta[property="twitter:image"]')
    .map((_, el) => $(el).attr("content") ?? "")
    .get();
  const linkImg = $('link[rel="image_src"]').attr("href") ?? "";
  const imageCandidates = [...jsonldImages, ...ogImages, ...twImages, linkImg];
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

  // Gallery <img> (P2.2): collected AFTER the chrome strip (related/nav already
  // gone) but BEFORE <a> removal (zoom links wrap product imgs). Conservative —
  // only product-gallery/media containers, to avoid thumbnails/related. Lowest
  // priority (after meta/JSON-LD). Reads src / data-src / first srcset URL.
  const galleryImgs: string[] = [];
  $(
    [
      '[class*="gallery" i] img',
      '[class*="product-media" i] img',
      '[class*="product__media" i] img',
      '[class*="product-image" i] img',
      '[class*="productimage" i] img',
      '[class*="pdp" i] img',
    ].join(", "),
  ).each((_, el) => {
    const a = $(el);
    const fromSrcset =
      (a.attr("srcset") || a.attr("data-srcset") || "").split(",")[0]?.trim().split(/\s+/)[0] ?? "";
    const src = a.attr("src") || a.attr("data-src") || fromSrcset;
    if (src) galleryImgs.push(src);
  });

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

  let text = [title, ogTitle, metaDesc, jsonld, embedded, ...containerParts]
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

  // Product images: resolve each candidate to an absolute http(s) URL, dedupe,
  // and cap. Order preserves source priority (JSON-LD gallery first).
  const seen = new Set<string>();
  const images: string[] = [];
  for (const cand of [...imageCandidates, ...galleryImgs]) {
    const r = resolveImage(cand, url);
    if (r && !seen.has(r)) {
      seen.add(r);
      images.push(r);
      if (images.length >= MAX_IMAGES) break;
    }
  }

  return {
    text,
    categoryHint,
    thin: productLen < THIN_TEXT_THRESHOLD,
    ...(images.length ? { images } : {}),
  };
}

const MAX_IMAGES = 5;

// Resolve an image candidate to an absolute http(s) URL (vs the page URL).
// Returns undefined for missing/relative/non-web values or SVG (logos/icons).
// `data:` URIs are rejected too (their protocol isn't http(s)) — L3.
function resolveImage(
  candidate: string | undefined,
  base: string,
): string | undefined {
  if (!candidate) return undefined;
  try {
    const u = new URL(candidate, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    if (/\.svg($|\?)/i.test(u.pathname)) return undefined;
    return u.toString();
  } catch {
    // ignore unparseable
  }
  return undefined;
}

// --- SSRF guard + response-size cap (security hardening) --------------------
// The endpoint fetches a user-supplied URL server-side, so it must not be usable
// to reach internal / cloud-metadata addresses or non-web ports. We reject
// non-http(s), non-80/443 ports, IP literals in private/reserved ranges, and
// hostnames that DNS-resolve to such ranges. Redirects are re-validated per hop
// (safeFetch). Residual gap: DNS rebinding between this lookup and the socket
// connect (TOCTOU) — fully closing it needs a custom dispatcher; out of
// free-tier scope. This raises the bar substantially without new dependencies.
const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 4_000_000; // 4 MB cap to bound memory (OOM guard)

function ipv4IsReserved(ip: string): boolean {
  const o = ip.split(".").map((n) => Number(n));
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return true; // malformed -> treat as unsafe
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127) return true; // this-net, private, loopback
  if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast + reserved + 255.255.255.255
  return false;
}

function ipv6IsReserved(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::1" || s === "::") return true; // loopback / unspecified
  if (/^fe[89ab]/.test(s)) return true; // link-local fe80::/10
  if (/^f[cd]/.test(s)) return true; // unique local fc00::/7
  if (s.startsWith("2001:db8")) return true; // documentation
  const mapped = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
  if (mapped) return ipv4IsReserved(mapped[1]);
  return false;
}

export function isReservedAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return ipv4IsReserved(ip);
  if (v === 6) return ipv6IsReserved(ip);
  return true; // not a literal IP — the caller must resolve DNS first
}

export async function assertSafeUrl(raw: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.port && u.port !== "80" && u.port !== "443") return false;

  const host = u.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // Literal IP: check directly, no DNS.
  if (isIP(host)) return !isReservedAddress(host);

  // Obvious internal names (incl. bare hostnames with no dot).
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".")
  ) {
    return false;
  }

  // Resolve and ensure no address is private/reserved. If resolution fails
  // (NXDOMAIN, offline), there is no internal target to reach, so we allow it
  // and let the real fetch fail naturally.
  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.some((a) => isReservedAddress(a.address))) return false;
  } catch {
    return true;
  }
  return true;
}

// Read a response body with a hard byte cap (OOM guard). Returns null if the
// body exceeds the cap or cannot be read.
async function readBodyCapped(res: Response, max: number): Promise<string | null> {
  const body = res.body;
  if (!body) {
    const t = await res.text();
    return t.length > max ? null : t;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > max) {
        await reader.cancel();
        return null;
      }
      out += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  }
  out += decoder.decode();
  return out;
}

// Fetch with manual redirect handling, re-validating each hop against the SSRF
// guard. Returns the final response, or null if a hop is unsafe / too many hops.
// Exported so other server-side fetchers (e.g. the /api/image proxy) reuse the
// same per-hop guard instead of an unguarded redirect: "follow".
export async function safeFetch(
  startUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response | null> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await assertSafeUrl(current))) return null;
    const res = await fetch(current, { headers, redirect: "manual", signal });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  return null; // too many redirects
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

// One direct attempt. `retryable` marks a TRANSIENT failure (network blip or
// 5xx server error) worth a quick retry; a timeout (budget already spent) or a
// definitive 4xx (404/403 won't change on an immediate same-IP retry) is not.
async function attemptDirect(
  url: string,
): Promise<{ res: FetchResult; retryable: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await safeFetch(url, BROWSER_HEADERS, controller.signal);
    if (!res) return { res: { ok: false, reason: "blocked" }, retryable: false }; // unsafe host / too many redirects

    const statusReason = reasonForStatus(res.status);
    // 5xx are transient server errors (retryable); 4xx are definitive.
    if (statusReason)
      return { res: { ok: false, reason: statusReason }, retryable: res.status >= 500 };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html"))
      return { res: { ok: false, reason: "blocked" }, retryable: false };

    const html = await readBodyCapped(res, MAX_BODY_BYTES);
    if (html == null) return { res: { ok: false, reason: "blocked" }, retryable: false }; // oversize body
    const extract = extractText(html, url);

    // A near-empty page with no usable text -> likely JS-heavy SPA.
    if (extract.text.length < 40)
      return { res: { ok: false, reason: "js-heavy" }, retryable: false };

    return { res: { ok: true, extract, via: "direct" }, retryable: false };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { res: { ok: false, reason: "timeout" }, retryable: false }; // spent the budget
    }
    return { res: { ok: false, reason: "blocked" }, retryable: true }; // network blip
  } finally {
    clearTimeout(timer);
  }
}

// Direct fetch with ONE retry on a transient failure (P2.1 / #P2-A). Anti-bot
// blocking is sometimes non-deterministic, so a quick retry can recover a flaky
// read. Retries cost little: transient errors return fast (not a full timeout),
// so the worst case stays well within maxDuration=30 (≤2 quick fails + reader).
async function directFetch(url: string): Promise<FetchResult> {
  const first = await attemptDirect(url);
  if (first.res.ok || !first.retryable) return first.res;
  const second = await attemptDirect(url);
  return second.res;
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

    const capped = await readBodyCapped(res, MAX_BODY_BYTES);
    if (capped == null) return null; // oversize body
    const raw = capped.replace(/\s+/g, " ").trim();
    if (raw.length < 40) return null;

    const text = focusReaderText(raw);
    // Markdown images from the FOCUSED product window (P2.2) — less nav/logo
    // noise than the raw page. Capped. fetchPage prefers direct images, so these
    // only surface when the direct fetch yielded none (fully blocked pages).
    const imgs: string[] = [];
    const seenImg = new Set<string>();
    for (const m of text.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)) {
      const r = resolveImage(m[1], url);
      if (r && !seenImg.has(r)) {
        seenImg.add(r);
        imgs.push(r);
        if (imgs.length >= 3) break;
      }
    }
    return {
      text,
      categoryHint: categoryFromUrl(url),
      thin: false,
      ...(imgs.length ? { images: imgs } : {}),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string): Promise<FetchResult> {
  // SSRF guard before any egress: never let a user URL point our requests at
  // internal hosts (covers both the direct fetch and the reader-proxy path).
  if (!(await assertSafeUrl(url))) return { ok: false, reason: "blocked" };

  const direct = await directFetch(url);

  // Fast path: a healthy direct read with real product text.
  if (direct.ok && !direct.extract.thin && hasFabricSignal(direct.extract.text)) {
    return direct;
  }

  // Fallback: blocked, thin, or no fabric signal -> try the reader proxy.
  const reader = await fetchViaReader(url);
  if (reader && hasFabricSignal(reader.text)) {
    // The reader returns text only (no images). We already fetched the direct
    // HTML — carry its images over so a JS-heavy-but-not-blocked page (e.g.
    // Superdry: og:image present, composition JS-loaded) keeps its photo (A2).
    const directImages = direct.ok ? direct.extract.images : undefined;
    return {
      ok: true,
      extract: {
        ...reader,
        ...(directImages && directImages.length ? { images: directImages } : {}),
      },
      via: "reader",
    };
  }

  // Reader didn't help. Prefer returning a (thin) direct read over a hard
  // failure so the parser can still report whatever little it found.
  if (direct.ok) return direct;
  return direct; // original unreadable reason
}
