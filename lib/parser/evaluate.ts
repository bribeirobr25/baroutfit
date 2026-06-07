// Scoring, wrinkle verdict, and confidence degradation (PARSER §5, §6, §7).
// Consumes the extracted tokens; never reads the page or invents data.

import type {
  Category,
  CategoryResult,
  CompositionPart,
  Confidence,
  FiberType,
  Score,
  Spinning,
  Weave,
  Wrinkle,
} from "@/lib/types";
import {
  APPROPRIATE_WEAVES,
  classifyGsm,
  ELASTANE_HIGH,
  FIBER_QUALITY,
  KNIT_WEAVES,
  POLYESTER_WARN_PCT,
  SHIRT_WEAVE_RANK,
  SPINNING_QUALITY,
} from "@/lib/knowledge/guide";
import { hasFiber, pctOf } from "./tokens";

export interface ParserData {
  category: CategoryResult;
  composition: CompositionPart[];
  fiberType: FiberType | null;
  premiumFiber: boolean;
  gsm: number | null;
  weave: Weave | null;
  spinning: Spinning | null;
  nonIron: boolean;
  construction: string[];
  elastane: number | null;
  polyester: number | null;
}

const WOVEN_WEAVES: Weave[] = [
  "twill",
  "oxford",
  "poplin",
  "chambray",
  "flannel",
  "corduroy",
  "denim",
];

// Fiber types that imply a cotton base (everything except merino wool / TENCEL).
function isCottonish(fiberType: FiberType | null): boolean {
  return (
    fiberType === "Supima" ||
    fiberType === "Pima" ||
    fiberType === "organic" ||
    fiberType === "long-staple" ||
    fiberType === "generic"
  );
}

function isKnownCategory(c: CategoryResult): c is Category {
  return c === "tshirt" || c === "shirt" || c === "pullover" || c === "hoodie";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreFabric(d: ParserData): Score {
  // Fiber (largest weight). ELS/premium counts as top tier even if reported as
  // "long-staple".
  const fiberQ = d.fiberType
    ? d.premiumFiber
      ? 4
      : FIBER_QUALITY[d.fiberType]
    : 0;
  const fiberPoints = (fiberQ / 4) * 40;

  // Weave appropriateness for the category.
  let weavePoints = 0;
  const appropriate =
    d.weave != null &&
    isKnownCategory(d.category) &&
    APPROPRIATE_WEAVES[d.category].includes(d.weave);
  if (d.weave) {
    if (d.category === "shirt") {
      weavePoints = ((SHIRT_WEAVE_RANK[d.weave] ?? 0) / 4) * 20;
    } else if (appropriate) {
      weavePoints =
        d.weave === "french-terry" ? 20 : d.weave === "fleece" ? 14 : 12;
    } else {
      weavePoints = 6; // present but not the expected weave for the category
    }
  }

  // Construction signals + premium spinning bonus.
  const premiumSpin = d.spinning != null && SPINNING_QUALITY[d.spinning] >= 3;
  let constructionPoints = Math.min(d.construction.length * 7, 20);
  if (premiumSpin) constructionPoints = Math.min(constructionPoints + 6, 20);

  // GSM band.
  let gsmPoints = 0;
  let gsmQuality: number | null = null;
  if (d.gsm != null) {
    if (isKnownCategory(d.category)) {
      const band = classifyGsm(d.category, d.gsm);
      if (band) {
        gsmQuality = band.quality;
        gsmPoints = (band.quality / 4) * 20;
      }
    } else {
      gsmPoints = 10; // GSM present but category unknown -> mid credit
    }
  }

  // Penalties for unjustified synthetics.
  let penalty = 0;
  if (d.polyester != null && d.polyester > POLYESTER_WARN_PCT) penalty += 15;
  if (d.elastane != null && d.elastane > ELASTANE_HIGH) penalty += 8;

  const value = clamp(
    fiberPoints + weavePoints + constructionPoints + gsmPoints - penalty,
  );

  // --- Band derivation (PARSER §5) ---
  const goodFiber =
    d.premiumFiber ||
    d.fiberType === "organic" ||
    d.fiberType === "long-staple";
  const gsmHigh = gsmQuality != null && gsmQuality >= 3;
  const hasConstruction = d.construction.length > 0 || premiumSpin;

  const highPolyester =
    d.polyester != null && d.polyester > POLYESTER_WARN_PCT;

  // Corroborating evidence beyond the fiber name. Fiber alone — even a good one
  // — is NOT enough to grade overall quality (mirrors the verified-confidence
  // rule: fiber + at least one of {GSM, weave, construction}). Without it the
  // honest verdict is "not enough data", never "low quality" (PARSER §5).
  const hasCorroboration =
    d.gsm != null ||
    d.weave != null ||
    d.construction.length > 0 ||
    d.nonIron ||
    premiumSpin ||
    highPolyester;

  let band: Score["band"];
  if (!hasCorroboration) {
    band = "indeterminate";
  } else if (goodFiber && (appropriate || gsmHigh) && hasConstruction) {
    band = "high";
  } else if (
    highPolyester ||
    (gsmQuality != null && gsmQuality <= 1 && !goodFiber) ||
    value < 25
  ) {
    band = "low";
  } else {
    band = "medium";
  }

  return { value, band };
}

export function wrinkleVerdict(d: ParserData): Wrinkle {
  const hasData =
    d.composition.length > 0 || d.fiberType != null || d.weave != null;
  if (!hasData) return "unknown";

  if (d.nonIron) return "low";
  if (d.fiberType === "merino") return "low";

  // Synthetic-dominant fabrics resist wrinkling (polyester ≥ 50%).
  const polyPct = pctOf(d.composition, "polyester");
  if (polyPct != null && polyPct >= 50) return "low";

  // TENCEL/lyocell in a relevant proportion (or present without a stated %).
  if (d.fiberType === "TENCEL" || hasFiber(d.composition, "tencel")) {
    const t = pctOf(d.composition, "tencel");
    if (t == null || t >= 30) return "low";
  }

  // Knits wrinkle little (jersey / french terry / fleece, or a knit category
  // with no woven weave stated).
  const knit =
    (d.weave != null && KNIT_WEAVES.includes(d.weave)) ||
    (d.weave == null &&
      (d.category === "tshirt" ||
        d.category === "pullover" ||
        d.category === "hoodie"));
  if (knit) return "low";

  // Linen wrinkles a lot, even when premium (KB §5).
  if (hasFiber(d.composition, "linen")) return "high";

  // Woven cotton (shirt or an explicit woven weave).
  const woven =
    (d.weave != null && WOVEN_WEAVES.includes(d.weave)) || d.category === "shirt";
  const cottonPct = pctOf(d.composition, "cotton");
  const cottonDominant =
    (cottonPct ?? 0) >= 50 ||
    // fiber type implies cotton and no synthetic outweighs it
    (cottonPct == null && isCottonish(d.fiberType) && polyPct == null) ||
    (hasFiber(d.composition, "cotton") && d.composition.length <= 1);

  if (woven && cottonDominant) {
    if (d.elastane != null && d.elastane >= 2 && d.elastane <= 8) return "medium";
    return "high"; // pure cotton plain weave, untreated
  }

  if (d.elastane != null && d.elastane >= 2 && d.elastane <= 8) return "medium";
  return "unknown";
}

export function confidenceLevel(d: {
  fiberVerified: boolean;
  gsmVerified: boolean;
  weaveVerified: boolean;
  constructionCount: number;
}): Confidence {
  if (
    d.fiberVerified &&
    (d.gsmVerified || d.weaveVerified || d.constructionCount > 0)
  ) {
    return "verified";
  }
  // Page was read (parser only runs on read pages) but data is thin.
  return "partial";
}
