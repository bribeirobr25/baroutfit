// Typed distillation of docs/KNOWLEDGE-BASE.md (which in turn distills
// docs/rules/guia-qualidade-roupas-2026-v2.md). Data + classifiers only — no
// page-reading logic. In case of doubt, the docs are the source of truth.
//
// Hierarchy of quality (priority order, KB §1):
//   fiber > weave > construction > GSM > brand
// "100% cotton" alone is neutral, not proof of quality.

import type { Category, FiberType, Spinning, Weave } from "@/lib/types";

// --- GSM bands per category (KB §3) -----------------------------------------
// Quality is normalized to a 0..4 scale so the scorer can treat categories
// uniformly. `label` keeps the guide's own descriptor (internal/English).
// Ranges are made contiguous (the guide leaves small gaps, e.g. tshirt 150-160);
// gaps are folded into the adjacent lower band.

export type GsmQuality = 0 | 1 | 2 | 3 | 4; // 0 too-light .. 4 top

export interface GsmBand {
  min: number; // inclusive
  max: number; // exclusive (Infinity for open-ended)
  quality: GsmQuality;
  label: string;
}

export const GSM_BANDS: Record<Category, GsmBand[]> = {
  tshirt: [
    { min: 0, max: 150, quality: 1, label: "basic" },
    { min: 150, max: 180, quality: 2, label: "good" },
    { min: 180, max: 220, quality: 3, label: "premium" },
    { min: 220, max: Infinity, quality: 4, label: "heavyweight premium" },
  ],
  // Dress shirt vs overshirt are different garments (KB §3 note). Both heavy
  // ranges are legitimate (not low quality) — a 308 GSM overshirt is premium.
  shirt: [
    { min: 0, max: 110, quality: 1, label: "very light" },
    { min: 110, max: 130, quality: 2, label: "light (dress)" },
    { min: 130, max: 180, quality: 4, label: "excellent/premium (dress)" },
    { min: 180, max: 250, quality: 3, label: "casual heavy" },
    { min: 250, max: Infinity, quality: 3, label: "overshirt" },
  ],
  pullover: [
    { min: 0, max: 280, quality: 1, label: "basic" },
    { min: 280, max: 380, quality: 2, label: "good" },
    { min: 380, max: 450, quality: 3, label: "premium" },
    { min: 450, max: Infinity, quality: 4, label: "luxury" },
  ],
  hoodie: [
    { min: 0, max: 300, quality: 1, label: "basic" },
    { min: 300, max: 420, quality: 2, label: "good" },
    { min: 420, max: Infinity, quality: 3, label: "premium" },
  ],
};

export function classifyGsm(
  category: Category,
  gsm: number,
): GsmBand | null {
  const bands = GSM_BANDS[category];
  return bands.find((b) => gsm >= b.min && gsm < b.max) ?? null;
}

// --- Fiber quality ranking (KB §2, scoring §5) -------------------------------
// Premium tier: Supima / Pima / merino / TENCEL / egyptian / modal (and
// extra-long-staple, handled in the parser). Mid tier: organic, plain
// long-staple. Base: generic cotton. NB: `egyptian` and `modal` are currently
// only produced by the KB (audited-brand reference); the parser does not yet
// classify a page as egyptian/modal — see CLAUDE.md §7 roadmap.
export const FIBER_QUALITY: Record<FiberType, GsmQuality> = {
  Supima: 4,
  Pima: 4,
  merino: 4,
  TENCEL: 4,
  egyptian: 4,
  modal: 4,
  "long-staple": 2,
  // A2: organic is a sustainability/agronomy label, not a fiber-quality grade
  // (organic cotton can be short-staple upland) — graded as base, like generic.
  organic: 1,
  generic: 1,
};

export const PREMIUM_FIBERS: FiberType[] = [
  "Supima",
  "Pima",
  "merino",
  "TENCEL",
  "egyptian",
  "modal",
];

// --- Weave ranking by category ----------------------------------------------
// Shirt weave ranking (KB §4): Twill > Oxford > Chambray > Poplin.
// "Appropriate weave for the category" is what scoring rewards (PARSER §5).
export const SHIRT_WEAVE_RANK: Record<string, number> = {
  twill: 4,
  oxford: 3,
  chambray: 2,
  flannel: 2,
  corduroy: 2,
  denim: 2,
  poplin: 1,
};

// Knit weaves appropriate to their category.
export const KNIT_WEAVES: Weave[] = ["jersey", "french-terry", "fleece"];

// Which weaves "fit" each category (used to reward appropriateness, not to
// penalize — an unexpected weave just earns no bonus).
export const APPROPRIATE_WEAVES: Record<Category, Weave[]> = {
  tshirt: ["jersey"],
  shirt: ["twill", "oxford", "poplin", "chambray", "flannel", "corduroy", "denim"],
  pullover: ["french-terry", "fleece"],
  hoodie: ["french-terry", "fleece"],
};

// --- Spinning ranking (KB §2) -----------------------------------------------
// Compact > Combed Ring-Spun > Ring-Spun > Open-End. loopwheeled is a heritage
// construction signal (strong, esp. on tshirts).
export const SPINNING_QUALITY: Record<Spinning, GsmQuality> = {
  loopwheeled: 4,
  compact: 4,
  "combed-ring-spun": 3,
  "ring-spun": 2,
  combed: 2,
  "open-end": 0,
};

// --- Elastane guidance (tshirt, KB §2) --------------------------------------
// 0% = max naturalness; 2-5% = good balance; >8% = reduces durability.
export const ELASTANE_GOOD_MAX = 5;
export const ELASTANE_HIGH = 8;

// --- Synthetic penalty (KB §6 "Atenção") ------------------------------------
// Polyester >40% is a warning sign when there is no technical reason.
export const POLYESTER_WARN_PCT = 40;

// --- Construction signals (PARSER §4.7, KB §6) ------------------------------
// Each present signal adds to the score. These are the canonical internal keys.
export const CONSTRUCTION_SIGNALS = [
  "corozo",
  "mother-of-pearl",
  "two-ply",
  "twin-needle",
  "gusset",
  "sanforized",
  "loopwheeled",
] as const;
export type ConstructionSignal = (typeof CONSTRUCTION_SIGNALS)[number];
