// Product-level matching for audited brands (Fase B / decisão #4).
// Given a pasted URL, identify WHICH audited product it most likely is, so the
// UI can surface our verified reference (specs = fact, tier = our judgment) for
// premium pieces the page-reading rubric undersells.
//
// The KB has no per-product URL, so matching is heuristic (URL slug <-> product
// name). To avoid mislabelling under the app's highest-trust badge, a product
// match REQUIRES a *distinctive* token (generic words like "the/shirt/t-shirt/
// cotton/colours/brand name" are stripped) AND a unique winner. Otherwise we
// fall back to a single product in the parsed category, else brand-level (no
// product, no tier/specs). Precision over coverage (audit Risk 1).

import type { CategoryResult } from "@/lib/types";
import {
  matchBrandByHost,
  type AuditedBrand,
  type AuditedProduct,
} from "./brands";

// Non-distinctive tokens: articles, garment nouns, gender, fit, colours, locale
// path segments. These can't distinguish two products of the same brand.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "with", "in", "for", "by", "de", "la", "le",
  "mens", "men", "man", "womens", "women", "woman", "unisex", "kids", "kid",
  "shirt", "shirts", "tshirt", "tshirts", "tee", "tees", "t", "top", "tops",
  "crew", "neck", "sleeve", "longsleeve", "long", "short",
  "cotton", "fabric", "standard",
  "white", "black", "navy", "blue", "beige", "grey", "gray", "green", "red",
  "ecru", "cream", "stone", "olive", "khaki", "brown", "sand", "natural",
  "charcoal", "heather", "oatmeal", "indigo",
  "fit", "regular", "slim", "relaxed", "oversize", "oversized",
  "p", "products", "product", "shop", "collections", "collection",
  "en", "de", "es", "pt", "us", "uk", "fr", "it", "br", "www", "col",
]);

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export interface ProductMatch {
  brand: AuditedBrand;
  product: AuditedProduct | null;
  matchLevel: "product" | "category" | "brand";
}

export function matchAuditedProduct(opts: {
  host: string;
  url: string;
  category: CategoryResult;
}): ProductMatch | null {
  const brand = matchBrandByHost(opts.host);
  if (!brand) return null;

  let urlTokens: Set<string>;
  try {
    urlTokens = new Set(tokenize(new URL(opts.url).pathname));
  } catch {
    urlTokens = new Set(tokenize(opts.url));
  }
  const brandTokens = new Set(tokenize(brand.name));

  const distinctiveOf = (p: AuditedProduct): string[] =>
    tokenize(p.product).filter((t) => !STOPWORDS.has(t) && !brandTokens.has(t));

  // Score each product by how many of its DISTINCTIVE tokens appear in the URL.
  let best: AuditedProduct | null = null;
  let bestScore = 0;
  let secondScore = 0;
  for (const p of brand.products) {
    const score = distinctiveOf(p).filter((t) => urlTokens.has(t)).length;
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = p;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  // Product match needs at least one distinctive hit AND a strict unique winner.
  if (best && bestScore >= 1 && bestScore > secondScore) {
    return { brand, product: best, matchLevel: "product" };
  }

  // Fallback: exactly one audited product in the parsed category.
  if (opts.category !== "unknown") {
    const inCat = brand.products.filter((p) => p.category === opts.category);
    if (inCat.length === 1) {
      return { brand, product: inCat[0], matchLevel: "category" };
    }
  }

  // Brand matched, product uncertain — no tier/specs surfaced.
  return { brand, product: null, matchLevel: "brand" };
}
