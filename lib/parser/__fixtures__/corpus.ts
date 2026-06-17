// Regression corpus (Fase A — A0). Representative product-page texts spanning
// every archetype the scorer must handle, used to FREEZE current behaviour
// before the abstention/organic changes (A1/A2) and to audit exactly what each
// change shifts. Snapshotted in corpus.test.ts.
//
// These are representative fixtures (some derived from known audited-brand
// specs), not live scrapes — enough to net scorer regressions deterministically
// in CI. Expanding with real saved HTML is a follow-up (does not block Fase A).

import type { CategoryResult } from "@/lib/types";

export interface CorpusItem {
  name: string;
  text: string;
  hint?: CategoryResult;
}

export const CORPUS: CorpusItem[] = [
  // --- in-scope: cotton (premium / organic / generic) ----------------------
  {
    name: "asket-tshirt (organic long-staple, 180gsm)",
    text: "Asket The T-Shirt. 100% organic cotton, long staple. 180 g/m². Made in Portugal. Twin-needle hems.",
  },
  {
    name: "sanvt-heavyweight (organic, 235gsm)",
    text: "SANVT The Heavyweight T-Shirt. 100% organic cotton. 235 GSM. Spun in Italy, made in Portugal.",
  },
  {
    name: "buckmason-supima (140gsm)",
    text: "Buck Mason Curve-Hem Tee. 100% Supima cotton. 140 g/m². Made in USA.",
  },
  {
    name: "hollister-heavy (generic cotton, 235gsm)",
    text: "Hollister Boxy Heavyweight Cotton Crew T-Shirt. 100% cotton. 235 GSM. Boxy fit.",
  },
  // Reproduction of the owner's reported "low" symptom (audit 2026-06-16): a
  // plain cotton JERSEY tee with NO GSM stated. The snapshot here is the ground
  // truth for diagnosing/fixing step C (do not blind-update).
  {
    name: "hugoboss-jersey-tee (generic cotton, jersey, no GSM) — repro",
    text: "Hugo Boss Regular Fit T-Shirt aus Baumwoll-Jersey. 100% Baumwolle.",
    hint: "tshirt",
  },
  {
    name: "generic-jersey-tee-nogsm (generic cotton, jersey, no GSM) — repro",
    text: "Crew neck t-shirt. 100% cotton. Jersey knit.",
    hint: "tshirt",
  },
  // Reproduction of the LATENT `value < 25 -> low` bug the auditor predicted
  // (2026-06-16): a generic shirt with a weak corroborator (non-iron) but no
  // GSM. It escapes the !hasCorroboration guard (nonIron corroborates) and hits
  // value<25 -> a FALSE "low". This is the absence->judgment bug, still active.
  {
    name: "noniron-generic-shirt-nogsm — repro latent value<25 low",
    text: "Non-iron dress shirt. 100% cotton.",
    hint: "shirt",
  },
  // GUARD (audit 2026-06-16): a genuinely light-weight generic tee MUST stay
  // "low" after P1 removes value<25 — its `low` comes from real negative
  // evidence (gsmQuality<=1 && !goodFiber), not the catch-all. value here is
  // >= 25, so if it reads `low` it proves the negative-evidence path fires
  // independently of value<25. Re-baseline after P1 must keep this `low`.
  {
    name: "lightweight-generic-tee-140gsm — guard: legit low survives P1",
    text: "Lightweight cotton t-shirt. 100% cotton. Jersey. 140 g/m².",
    hint: "tshirt",
  },
  // Repro: Kiton-class — generic fiber (we don't detect Giza), informative weave
  // + construction, NO GSM. Reads `low` today (value<25); should become `medium`
  // after P1 (corroborated, no negative evidence). The audited #4 block still
  // shows the real tier for these.
  {
    name: "kiton-class-poplin-noGSM — repro premium shirt false low",
    text: "Camicia. 100% cotton. Poplin. Mother-of-pearl buttons. Hand-made in Napoli.",
    hint: "shirt",
  },
  // Repro for decision #3: the ONLY corroboration is a SINGLE construction token,
  // no GSM/weave. Reads `low` today; should become `indeterminate` after P1
  // (one thin signal isn't enough to grade).
  {
    name: "generic-1construction-noGSM — repro decision #3",
    text: "Cotton t-shirt. 100% cotton. Twin-needle stitching.",
    hint: "tshirt",
  },
  {
    name: "merz-215 (GOTS organic, loopwheeled, 7.2oz)",
    text: "Merz b. Schwanen 215 T-Shirt. 100% GOTS organic cotton. Loopwheeled in Germany. 7.2 oz/sq.yd.",
  },
  {
    name: "maison-cornichon (organic GOTS, 195gsm)",
    text: "Maison Cornichon T-Shirt. 100% organic cotton GOTS. 195 g/m². Made in France.",
  },
  {
    name: "isto-oxford (organic oxford shirt, 175gsm)",
    text: "ISTO. Oxford Shirt. 100% organic cotton. Oxford. 175 g/m². Mother-of-pearl buttons. Made in Portugal.",
  },
  {
    name: "asket-overshirt (organic two-ply twill, 308gsm)",
    text: "Asket The Overshirt. 100% organic cotton. 308 g/m² two-ply twill. Corozo buttons. Milled in Italy.",
  },
  {
    name: "generic-twill-shirt (140gsm, two-ply, corozo)",
    text: "Cotton twill shirt. 100% cotton. Twill. 140 g/m². Two-ply. Corozo buttons.",
  },
  {
    name: "cotton-elastane-tee (95/5, jersey, 200gsm)",
    text: "Stretch crew tee. 95% cotton 5% elastane. Jersey. 200 g/m².",
  },
  {
    name: "zara-nogsm (cotton, no gsm -> indeterminate)",
    text: "Camiseta básica. 100% algodão.",
  },
  {
    name: "hoodie-frenchterry (80/20 cotton/poly, 400gsm)",
    text: "Hooded sweatshirt. 80% cotton 20% polyester. French terry. 400 g/m².",
  },
  // --- in-scope: merino / cellulosics --------------------------------------
  {
    name: "merino-tee (100% merino, 180gsm)",
    text: "Merino Wool Tee. 100% merino wool. 180 g/m².",
  },
  {
    name: "norse-falster (50/50 cotton/TENCEL, poplin) — KEY blend",
    text: "Norse Projects Falster. 50% cotton 50% TENCEL Lyocell. Poplin. Mother-of-pearl buttons. Made in Portugal.",
  },
  {
    name: "cotton-tencel-tee (50/50 blend)",
    text: "Tech tee. 50% cotton 50% TENCEL. 200 g/m².",
  },
  {
    name: "insider-modal (92% tencel modal, 8% elastane)",
    text: "Insider Tech T-Shirt. 92% TENCEL modal, 8% elastane. Anti-odor. Made in Brazil.",
  },
  // --- out-of-scope: synthetics & other fibers -----------------------------
  {
    name: "polyester-100 (performance tee)",
    text: "Performance training tee. 100% polyester. 160 g/m².",
  },
  {
    name: "poly-blend-5050 (cotton/poly, no in-scope majority)",
    text: "Everyday tee. 50% cotton 50% polyester. 180 g/m².",
  },
  {
    name: "poly-blend-6040 (cotton majority -> in-scope)",
    text: "Workwear tee. 60% cotton 40% polyester. 200 g/m².",
  },
  {
    name: "silk-shirt (100% silk)",
    text: "Silk shirt. 100% silk. Made in Italy.",
  },
  {
    name: "wool-nonmerino (100% wool, unknown category)",
    text: "Wool jumper. 100% wool.",
  },
  {
    name: "linen-shirt (100% linen, 160gsm)",
    text: "Linen shirt. 100% linen. 160 g/m².",
  },
  {
    name: "viscose-dress (100% viscose, unknown category)",
    text: "Flowy dress. 100% viscose.",
  },
];
