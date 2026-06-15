// Fase B — KB-based recommendations. Turns the verdict into advice: "houses we
// trust in this category." Pure data over the audited brands; no network, no
// invented data. Honest framing: we present trusted picks in the SAME category,
// never a claim that the analyzed item is "worse" (the computed band and the
// editorial tier are different scales — comparing them would not be honest).

import type { CategoryResult, Recommendation } from "@/lib/types";
import { AUDITED_BRANDS, type AuditedProduct } from "./brands";

// Editorial tier vocabulary, best -> worst. Rank is the reversed index so a
// higher number means a better tier.
const TIER_ORDER = ["S+", "S", "S-/A+", "A+", "A", "A-", "B+", "B"] as const;

export function tierRank(tier: string): number {
  const i = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  return i === -1 ? -1 : TIER_ORDER.length - i;
}

// Floor: only recommend solid pieces (A- and better). B/B+ are weaker/partial.
const MIN_TIER_RANK = tierRank("A-");

export function recommendAlternatives(
  category: CategoryResult,
  opts: { excludeBrand?: string; limit?: number } = {},
): Recommendation[] {
  // The KB only audits tshirt and shirt; anything else has nothing to suggest.
  if (category !== "tshirt" && category !== "shirt") return [];
  const limit = opts.limit ?? 3;

  const picks: Recommendation[] = [];
  for (const brand of AUDITED_BRANDS) {
    if (opts.excludeBrand && brand.name === opts.excludeBrand) continue;
    if (!brand.domains[0]) continue;

    // Best qualifying product of this category for this brand (one per house, so
    // the list shows variety rather than three Asket tees).
    let best: AuditedProduct | null = null;
    for (const p of brand.products) {
      if (p.category !== category) continue;
      if (tierRank(p.tier) < MIN_TIER_RANK) continue;
      if (best == null || tierRank(p.tier) > tierRank(best.tier)) best = p;
    }
    if (!best) continue;

    picks.push({
      brand: brand.name,
      product: best.product,
      category,
      tier: best.tier,
      fiber: best.fiber,
      gsm: best.gsm,
      wrinkle: best.wrinkle,
      url: `https://${brand.domains[0]}`,
    });
  }

  picks.sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
  return picks.slice(0, limit);
}
