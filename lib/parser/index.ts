// Parser orchestration (PARSER §1). Input: text extracted from the product
// page. Output: the structured analysis the API turns into AnalyzeOk (SPEC §3).
// Brand matching is URL-based and lives in the API, not here.

import type {
  CategoryResult,
  CompositionPart,
  FieldCandidate,
  FieldSource,
  Findings,
  MissingKey,
  Score,
  Wrinkle,
  Confidence,
} from "@/lib/types";
import { normalize } from "./normalize";
import { detectCategory } from "./category";
import {
  compositionDisplay,
  detectConstruction,
  detectFiberType,
  detectNonIron,
  detectSpinning,
  extractComposition,
  extractGsm,
  extractWeaves,
  pctOf,
} from "./tokens";
import {
  confidenceLevel,
  scoreFabric,
  wrinkleVerdict,
  type ParserData,
} from "./evaluate";

export interface ParseResult {
  category: CategoryResult;
  categoryConfidence: "high" | "low";
  findings: Findings;
  missing: MissingKey[];
  score: Score;
  wrinkle: Wrinkle;
  confidence: Confidence;
}

export interface ParseOptions {
  // Optional category hint (e.g. from URL slug or JSON-LD) used only when the
  // text is ambiguous. Never overrides a confident text detection.
  categoryHint?: CategoryResult;
  // P2.4 Fase 1a — provenance-tagged fiber text slices. When a candidate yields
  // a composition, it is used (and its source recorded) instead of the blob;
  // absent ⇒ the blob fallback (byte-identical to pre-P2.4).
  candidates?: { fiber?: FieldCandidate[] };
}

// Precedence for fiber candidates (#P2.4): structured+product first, then meta,
// visible text, reader last. `scope:"catalog"` is dropped (A3/#P2.4-B).
const FIBER_SOURCE_RANK: Record<FieldSource, number> = {
  structured: 0,
  meta: 1,
  "visible-text": 2,
  reader: 3,
};

// Choose the composition: the highest-precedence candidate whose raw text yields
// one, else the full blob (unchanged behaviour). Returns the source iff a
// candidate was used. Composition feeds BOTH the displayed fiber AND scoring, so
// display and verdict stay consistent.
function chooseComposition(
  text: string,
  candidates: FieldCandidate[] | undefined,
): { composition: CompositionPart[]; source?: FieldSource } {
  if (candidates && candidates.length) {
    const ranked = candidates
      .filter((c) => c.scope !== "catalog")
      .sort((a, b) => FIBER_SOURCE_RANK[a.source] - FIBER_SOURCE_RANK[b.source]);
    for (const c of ranked) {
      // Normalize the candidate raw the SAME way as the blob — extractComposition
      // assumes normalized input, so a raw slice would silently under-parse.
      const comp = extractComposition(normalize(c.raw));
      if (comp.length) return { composition: comp, source: c.source };
    }
  }
  return { composition: extractComposition(text) };
}

export function parse(rawText: string, opts: ParseOptions = {}): ParseResult {
  const text = normalize(rawText);

  // --- Category ---
  // The URL slug (categoryHint) is the most reliable single signal for a
  // product page and is immune to nav/related-product noise, so it is
  // authoritative when known; text detection is the fallback. Confidence drops
  // when the page text confidently disagrees with the slug.
  const textDet = detectCategory(text);
  let category: CategoryResult;
  let categoryConfidence: "high" | "low";
  if (opts.categoryHint && opts.categoryHint !== "unknown") {
    category = opts.categoryHint;
    categoryConfidence =
      textDet.category === opts.categoryHint || textDet.category === "unknown"
        ? "high"
        : "low";
  } else {
    category = textDet.category;
    categoryConfidence = textDet.confidence;
  }

  // --- Tokens ---
  // P2.4 Fase 1a: composition from the highest-precedence fiber candidate (with
  // provenance), else the blob (unchanged). Feeds display + scoring consistently.
  const { composition, source: fiberSource } = chooseComposition(
    text,
    opts.candidates?.fiber,
  );
  const fiberDisplay = compositionDisplay(composition);
  const { fiberType, premium } = detectFiberType(text);
  const { gsm, fromOz } = extractGsm(text);
  const weaves = extractWeaves(text);
  const weave = weaves[0] ?? null;
  const spinning = detectSpinning(text);
  const nonIron = detectNonIron(text);
  const construction = detectConstruction(text);
  const elastane = pctOf(composition, "elastane");
  const polyester = pctOf(composition, "polyester");

  // --- Findings (verified = read explicitly from the page) ---
  const findings: Findings = {
    fiber: {
      value: fiberDisplay,
      verified: fiberDisplay != null,
      ...(fiberSource && fiberDisplay != null ? { source: fiberSource } : {}),
    },
    fiberType: { value: fiberType, verified: fiberType != null },
    gsm: {
      value: gsm,
      verified: gsm != null,
      ...(fromOz ? { note: "derived from oz/yd²" } : {}),
    },
    weave: { value: weave, verified: weave != null },
    spinning: { value: spinning, verified: spinning != null },
    elastane: { value: elastane, verified: elastane != null },
    polyester: { value: polyester, verified: polyester != null },
    nonIron: { value: nonIron, verified: nonIron },
    construction,
  };

  // --- Evaluation ---
  const data: ParserData = {
    category,
    composition,
    fiberType,
    premiumFiber: premium,
    gsm,
    weave,
    spinning,
    nonIron,
    construction,
    elastane,
    polyester,
  };

  const score = scoreFabric(data);
  const wrinkle = wrinkleVerdict(data);
  const confidence = confidenceLevel({
    // Knowing the fiber TYPE (e.g. "long-staple", "Supima") is fiber knowledge
    // read from the page, even when no "NN% cotton" composition string is
    // present (PARSER §7). Some shops state the type but not the percentage.
    fiberVerified: findings.fiber.verified || findings.fiberType.verified,
    gsmVerified: findings.gsm.verified,
    weaveVerified: findings.weave.verified,
    constructionCount: construction.length,
  });

  // --- Missing (what to check on the label) ---
  const missing: MissingKey[] = [];
  if (!findings.fiber.verified) missing.push("fiber");
  if (!findings.fiberType.verified) missing.push("fiberType");
  if (!findings.gsm.verified) missing.push("gsm");
  if (!findings.weave.verified) missing.push("weave");
  if (!findings.spinning.verified) missing.push("spinning");

  return {
    category,
    categoryConfidence,
    findings,
    missing,
    score,
    wrinkle,
    confidence,
  };
}
