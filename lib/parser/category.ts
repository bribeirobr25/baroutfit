// Category detection (PARSER §3), multi-language EN/PT-BR/DE/ES.
//
// The hard case is "shirt" vs "t-shirt": with word boundaries, /\bshirt\b/ would
// match inside "t-shirt" (the hyphen is a boundary). We therefore strip t-shirt
// tokens first, then count plain "shirt". "sweatshirt"/"overshirt" are single
// words, so \bshirt\b does NOT match inside them.

import type { CategoryResult } from "@/lib/types";
import { countMatches } from "./normalize";

export interface CategoryDetection {
  category: CategoryResult;
  confidence: "high" | "low";
}

const TSHIRT_RE =
  /\bt[-\s]?shirts?\b|\btees?\b|\bcamisetas?\b|\bplayeras?\b/g;
const CAMISETA_WEAK_RE = /\bmalha\b/g; // weak knit cue (PT)

const SHIRT_RE =
  /\bshirts?\b|\bcamisas?\b|\bhemd(?:en)?\b|\boberhemd(?:en)?\b|\buberhemd(?:en)?\b|\bovershirts?\b|\bbutton[-\s]?downs?\b|\bchemises?\b/g;

const PULLOVER_RE =
  /\bsweatshirts?\b|\bpullovers?\b|\bmoleto(?:m|ns)\b|\bsudaderas?\b|\bcrewneck sweat\b/g;

const HOODIE_RE =
  /\bhoodies?\b|\bkapuzenpullover\b|\bkapuzensweatshirts?\b|\bkapuze\b|com capuz|con capucha|\bhooded\b/g;

const BUTTON_CUE_RE =
  /\bbuttons?\b|\bboto(?:es|ao|oes)\b|\bknopf(?:e)?\b|\bknopfe\b|\bbotones?\b|\bboton\b/;
const CREW_TEE_CUE_RE = /crew neck tee|gola careca|cuello redondo/;

export function detectCategory(normalizedText: string): CategoryDetection {
  // Hoodie is the most specific: a hood cue decides it, even over "sweatshirt"
  // (a "hooded sweatshirt" is a hoodie, not a pullover).
  const hoodie = countMatches(normalizedText, HOODIE_RE);
  if (hoodie > 0) return { category: "hoodie", confidence: "high" };

  // Strip t-shirt tokens so plain "shirt" counts only real shirts.
  const tshirtHits =
    countMatches(normalizedText, TSHIRT_RE) +
    countMatches(normalizedText, CAMISETA_WEAK_RE);
  const cleaned = normalizedText.replace(TSHIRT_RE, " ");

  const shirt = countMatches(cleaned, SHIRT_RE);
  const pullover = countMatches(cleaned, PULLOVER_RE);
  const tshirt = tshirtHits;

  const scores: Array<[CategoryResult, number]> = [
    ["tshirt", tshirt],
    ["shirt", shirt],
    ["pullover", pullover],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = scores[0];
  const [, secondScore] = scores[1];

  if (topScore === 0) return { category: "unknown", confidence: "low" };

  // Disambiguate a tshirt/shirt clash with construction cues.
  if (tshirt > 0 && shirt > 0) {
    const hasButtons = BUTTON_CUE_RE.test(normalizedText);
    const hasCrew = CREW_TEE_CUE_RE.test(normalizedText);
    if (hasButtons && !hasCrew) return { category: "shirt", confidence: "high" };
    if (hasCrew && !hasButtons) return { category: "tshirt", confidence: "high" };
    // No decisive cue and counts are close -> low confidence on the leader.
    if (topScore === secondScore) return { category: topCat, confidence: "low" };
  }

  // Clear single leader.
  const confidence = secondScore === 0 || topScore > secondScore ? "high" : "low";
  return { category: topCat, confidence };
}
