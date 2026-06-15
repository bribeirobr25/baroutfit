// Token extraction (PARSER §4), multi-language EN/PT-BR/DE/ES.
//
// Golden rule (PARSER §2): only mark as found what appears explicitly. Never
// derive GSM from "heavyweight"/"pesada". Never assume premium fiber from price
// or brand.

import type { CompositionPart, FiberType, Spinning, Weave } from "@/lib/types";

// --- Composition (PARSER §4.1) ----------------------------------------------
// Canonical fiber -> normalized keyword alternatives (accent-stripped).
const FIBER_KEYWORDS: Array<[string, string[]]> = [
  // order matters: check specific/long names before "cotton"/"wool"
  ["tencel", ["tencel"]],
  ["lyocell", ["lyocell"]],
  ["modal", ["modal"]],
  ["viscose", ["viscose", "viscosa", "viskose"]],
  ["elastane", ["elastane", "elasthan", "elastano", "spandex", "lycra"]],
  ["polyester", ["polyester", "poliester"]],
  ["polyamide", ["polyamide", "polyamid", "poliamida", "nylon"]],
  ["silk", ["silk", "seda", "seide", "soie"]],
  ["linen", ["linen", "linho", "leinen", "lino"]],
  ["cotton", ["cotton", "algodao", "baumwolle", "algodon"]],
  ["wool", ["wool", "wolle", "lana", "la"]], // "la" = PT "lã" (accent-stripped)
  ["cashmere", ["cashmere", "kaschmir", "cachemira", "caxemira"]],
];

// Matches "<number>% <fiber phrase>". The phrase is letters/spaces/hyphens and
// stops naturally at any other character (digit, punctuation, markdown, etc.),
// capped to avoid running across unrelated words.
const COMPOSITION_RE = /(\d{1,3}(?:[.,]\d+)?)\s*%\s*([a-z][a-z\- ]{0,40})/g;

// Prose connectors (EN/DE/PT/ES). If one of these sits between the "%" and the
// fiber word, the match is a sentence ("1% of the global cotton production"),
// NOT a composition ("1% organic cotton"). Fiber qualifiers (organic, combed,
// supima, extra/long/staple, recycled, pure…) are deliberately NOT listed.
const PROSE_STOPWORDS = new Set([
  "of", "the", "a", "an", "our", "your", "we", "is", "are", "for", "from",
  "with", "world", "global", "than", "less", "more", "most", "all", "in", "to",
  "by", "made", "that", "this", "only", "about", "per", "und", "oder", "mit",
  "aus", "von", "der", "die", "das", "den", "dem", "de", "do", "da", "com",
  "no", "na", "del", "con", "los", "las", "el",
]);

function baseFiberOf(phrase: string): string | null {
  let best: { fiber: string; index: number } | null = null;
  for (const [canonical, kws] of FIBER_KEYWORDS) {
    for (const kw of kws) {
      // word-boundary match so "la" doesn't match inside "lana"/"algodon"
      const m = phrase.match(new RegExp(`(^|[^a-z])${kw}([^a-z]|$)`));
      if (m && m.index != null) {
        const idx = m.index + m[1].length;
        if (best == null || idx < best.index)
          best = { fiber: canonical === "lyocell" ? "tencel" : canonical, index: idx };
      }
    }
  }
  if (!best) return null;
  // Reject prose: stopwords before the fiber mean this is a sentence, not a
  // composition (guards against "1% of the global cotton …").
  const pre = phrase.slice(0, best.index).trim();
  if (pre && pre.split(/[\s-]+/).some((w) => PROSE_STOPWORDS.has(w))) return null;
  return best.fiber;
}

export function extractComposition(text: string): CompositionPart[] {
  const parts: CompositionPart[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(COMPOSITION_RE)) {
    const pct = parseFloat(m[1].replace(",", "."));
    const phrase = m[2].trim();
    const fiber = baseFiberOf(phrase);
    if (!fiber) continue;
    // The composition block often repeats across the page (JSON-LD + visible +
    // meta). Dedupe by fiber+pct so the display isn't "100% cotton, 100%
    // cotton, ...". A real composition lists each fiber once.
    const key = `${fiber}:${Number.isFinite(pct) ? pct : "?"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push({ fiber, raw: phrase, pct: Number.isFinite(pct) ? pct : null });
  }
  return parts;
}

export function pctOf(parts: CompositionPart[], fiber: string): number | null {
  const p = parts.find((x) => x.fiber === fiber);
  return p ? p.pct : null;
}

export function hasFiber(parts: CompositionPart[], fiber: string): boolean {
  return parts.some((x) => x.fiber === fiber);
}

// --- Fiber scope (PARSER §5, Fase A abstention) -----------------------------
// The scorer only has real quality criteria for cotton, merino wool, and the
// Lenzing cellulosics (TENCEL/lyocell, modal). Every other fiber (polyester,
// silk, linen, non-merino wool, viscose, polyamide, cashmere…) is recognized
// but NOT graded — the honest verdict is abstention ("out-of-scope"), never a
// faked grade. Scope is decided from the COMPOSITION (which carries those fibers
// with their %), not from `fiberType`, which is blind to non-cotton fibers.
export const IN_SCOPE_MIN_PCT = 60; // sum of in-scope fibers needed to grade

const IN_SCOPE_FIBERS = new Set(["cotton", "tencel", "modal"]);

function fiberInScope(fiber: string, fiberType: FiberType | null): boolean {
  if (IN_SCOPE_FIBERS.has(fiber)) return true;
  // wool only counts when it is merino (the composition part is just "wool"
  // either way; the merino distinction comes from detectFiberType).
  return fiber === "wool" && fiberType === "merino";
}

export type FiberScope = "in" | "out" | "unknown";

// "in"  -> grade normally.
// "out" -> abstain (out-of-scope band).
// "unknown" -> no composition was read; not abstention — falls through to the
//              existing data-driven paths (likely "indeterminate").
export function fiberScope(
  parts: CompositionPart[],
  fiberType: FiberType | null,
): FiberScope {
  if (parts.length === 0) return "unknown";
  const withPct = parts.filter((p) => p.pct != null);
  if (withPct.length > 0) {
    // Sum of in-scope percentages — a blend of two in-scope fibers (e.g.
    // 50% cotton + 50% TENCEL) sums to 100% and stays in scope.
    const inScopePct = withPct
      .filter((p) => fiberInScope(p.fiber, fiberType))
      .reduce((s, p) => s + (p.pct as number), 0);
    return inScopePct >= IN_SCOPE_MIN_PCT ? "in" : "out";
  }
  // No percentages stated: in scope only if every listed fiber is in scope.
  return parts.every((p) => fiberInScope(p.fiber, fiberType)) ? "in" : "out";
}

// Build a clean, language-neutral composition string for display from the
// parsed parts (e.g. "95% cotton, 5% elastane"). Falls back to null if empty.
export function compositionDisplay(parts: CompositionPart[]): string | null {
  if (parts.length === 0) return null;
  return parts
    .map((p) => (p.pct != null ? `${p.pct}% ${p.fiber}` : p.fiber))
    .join(", ");
}

// --- Fiber type / quality (PARSER §4.2) -------------------------------------
export interface FiberTypeResult {
  fiberType: FiberType | null;
  premium: boolean; // true for premium-tier fibers (incl. extra-long staple)
}

const ELS_RE =
  /extra[-\s]?long[-\s]?staple|\bels\b|fibra extra[-\s]?longa|extralangstapelig/;
const LONG_STAPLE_RE =
  /long[-\s]?staple|fibra longa|langstapelig|fibra larga/;
const ORGANIC_RE =
  /organic|organico|bio[-\s]?baumwolle|\bgots\b|\bbio\b/;

export function detectFiberType(text: string): FiberTypeResult {
  if (/\bmerino\b|merinowolle|lana merino|la merino/.test(text))
    return { fiberType: "merino", premium: true };
  if (/\bsupima\b/.test(text)) return { fiberType: "Supima", premium: true };
  if (/\bpima\b/.test(text)) return { fiberType: "Pima", premium: true };
  if (/\btencel\b|\blyocell\b/.test(text))
    return { fiberType: "TENCEL", premium: true };
  if (ELS_RE.test(text)) return { fiberType: "long-staple", premium: true };
  if (LONG_STAPLE_RE.test(text))
    return { fiberType: "long-staple", premium: false };
  if (ORGANIC_RE.test(text)) return { fiberType: "organic", premium: false };
  // generic only when a cotton-ish base is actually present
  if (/cotton|algodao|baumwolle|algodon/.test(text))
    return { fiberType: "generic", premium: false };
  return { fiberType: null, premium: false };
}

// --- GSM (PARSER §4.3) -------------------------------------------------------
export interface GsmResult {
  gsm: number | null;
  fromOz: boolean;
}

const OZ_TO_GSM = 33.906; // 1 oz/yd^2

const GSM_RE =
  /(\d{2,4}(?:[.,]\d+)?)\s*(?:g\s*\/\s*m2|g\s*\/\s*m²|gsm|g\s*\/\s*qm|gr\s*\/\s*m2|gr\s*\/\s*m²|g\s*\/\s*sqm|g\/m²)/;
const OZ_RE =
  /(\d{1,2}(?:[.,]\d+)?)\s*oz(?:\s*\/\s*(?:yd2|yd²|sq\.?\s*yd|sqyd|square yard))?/;

export function extractGsm(text: string): GsmResult {
  const direct = text.match(GSM_RE);
  if (direct) {
    const n = parseFloat(direct[1].replace(",", "."));
    if (Number.isFinite(n)) return { gsm: Math.round(n), fromOz: false };
  }
  const oz = text.match(OZ_RE);
  if (oz) {
    const n = parseFloat(oz[1].replace(",", "."));
    if (Number.isFinite(n)) return { gsm: Math.round(n * OZ_TO_GSM), fromOz: true };
  }
  return { gsm: null, fromOz: false };
}

// --- Weave (PARSER §4.4) -----------------------------------------------------
const WEAVE_KEYWORDS: Array<[Weave, RegExp]> = [
  ["twill", /\btwill\b|\bsarja\b|\bkoper\b|\bsarga\b/],
  ["oxford", /\boxford\b/],
  ["poplin", /\bpoplin\b|\bpopeline\b|\bpopelina\b/],
  ["chambray", /\bchambray\b/],
  ["flannel", /\bflannel\b|\bflanela\b|\bflanell\b|\bfranela\b/],
  ["corduroy", /\bcorduroy\b|veludo cotele|\bcord\b|\bpana\b/],
  ["denim", /\bdenim\b/],
  ["french-terry", /french[-\s]?terry/],
  ["fleece", /\bfleece\b|\bfelpa\b|moletom felpado/],
  ["jersey", /\bjersey\b/],
];

// Preference order when several weaves appear: wovens/structured first, then
// knits (the appropriate-weave bonus is applied by the scorer per category).
const WEAVE_PRIORITY: Weave[] = [
  "twill",
  "oxford",
  "french-terry",
  "fleece",
  "poplin",
  "chambray",
  "flannel",
  "corduroy",
  "denim",
  "jersey",
];

export function extractWeaves(text: string): Weave[] {
  const found = WEAVE_KEYWORDS.filter(([, re]) => re.test(text)).map(([w]) => w);
  return WEAVE_PRIORITY.filter((w) => found.includes(w));
}

// --- Spinning (PARSER §4.5) --------------------------------------------------
export function detectSpinning(text: string): Spinning | null {
  const loopwheeled = /loopwheel(?:ed)?/.test(text);
  if (loopwheeled) return "loopwheeled";
  const compact = /\bcompact(?:\s*spun)?\b/.test(text);
  if (compact) return "compact";
  const combed = /\bcombed\b|penteado|gekammt|peinado/.test(text);
  const ringSpun = /ring[-\s]?spun|ringgesponnen|hilado en anillos/.test(text);
  if (combed && ringSpun) return "combed-ring-spun";
  if (ringSpun) return "ring-spun";
  if (combed) return "combed";
  if (/open[-\s]?end/.test(text)) return "open-end";
  return null;
}

// --- Non-iron (PARSER §4.6) --------------------------------------------------
const NON_IRON_RE =
  /non[-\s]?iron|no[-\s]?iron|wrinkle[-\s]?free|wrinkle[-\s]?resistant|nao passa|nao amassa|bugelfrei|knitterfrei|bugelleicht|no plancha|antiarrugas/;

export function detectNonIron(text: string): boolean {
  return NON_IRON_RE.test(text);
}

// --- Construction signals (PARSER §4.7) -------------------------------------
const CONSTRUCTION_KEYWORDS: Array<[string, RegExp]> = [
  ["corozo buttons", /\bcorozo\b|tagua/],
  ["mother-of-pearl buttons", /mother[-\s]?of[-\s]?pearl|madreperola|perlmutt|\bnacar\b/],
  ["two-ply", /two[-\s]?ply|dois cabos|zweifadig|2[-\s]?ply/],
  ["twin-needle stitching", /twin[-\s]?needle|costura dupla|doppelnaht/],
  ["gusset", /\bgusset\b|triangle insert/],
  ["pre-shrunk/sanforized", /pre[-\s]?shrunk|sanforized|sanforizado|sanfor/],
  ["loopwheeled", /loopwheel(?:ed)?/],
];

export function detectConstruction(text: string): string[] {
  return CONSTRUCTION_KEYWORDS.filter(([, re]) => re.test(text)).map(([l]) => l);
}
