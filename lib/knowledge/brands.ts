// Audited brands — VERIFIED data from docs/KNOWLEDGE-BASE.md §7, which distills
// the report (docs/guides/...) confirmed by the audit (docs/audit/...).
//
// Use: when an analyzed URL's host matches an audited brand, the API flags it
// with a "this is an audited brand; verified reference data exists" badge
// (SPEC §3 brandMatch). The product-level data below is reference material; the
// API does NOT inject it into `findings` as verified, because we cannot be sure
// the pasted URL is that exact product (different SKUs differ — KB §7 note,
// Hollister washed 250 GSM). Honesty over convenience (CLAUDE.md §1).

import type { Category, FiberType, Weave, Wrinkle } from "@/lib/types";

export type BrandConfidence = "verified" | "partial";

export interface AuditedProduct {
  product: string;
  category: Category;
  fiber: string | null; // raw composition as published
  fiberType: FiberType | null;
  gsm: number | null; // null = brand does not publish it (do NOT invent)
  weave: Weave | null;
  construction: string[];
  origin: string | null;
  wrinkle: Wrinkle;
  tier: string; // editorial tier from the report (S+, A+, ...)
  confidence: BrandConfidence;
}

export interface AuditedBrand {
  name: string;
  domains: string[]; // matched against the URL host (suffix match)
  products: AuditedProduct[];
}

export const AUDITED_BRANDS: AuditedBrand[] = [
  {
    name: "Asket",
    domains: ["asket.com"],
    products: [
      {
        product: "The T-Shirt",
        category: "tshirt",
        fiber: "100% organic long-staple cotton",
        fiberType: "long-staple",
        gsm: 180,
        weave: "jersey",
        construction: ["twin-needle"],
        origin: "Portugal",
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "The Overshirt",
        category: "shirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: 308,
        weave: "twill",
        construction: ["two-ply", "corozo"],
        origin: "Italy + Portugal",
        wrinkle: "high",
        tier: "S+",
        confidence: "verified",
      },
    ],
  },
  {
    name: "Norse Projects",
    domains: ["norseprojects.com"],
    products: [
      {
        product: "Heavy Loose T-Shirt",
        category: "tshirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: 260,
        weave: "jersey",
        construction: ["twin-needle"],
        origin: "Portugal",
        wrinkle: "low",
        tier: "S+",
        confidence: "verified",
      },
      {
        product: "Falster TENCEL Shirt",
        category: "shirt",
        fiber: "50% cotton / 50% TENCEL",
        fiberType: "TENCEL",
        gsm: null,
        weave: "poplin",
        construction: ["mother-of-pearl"],
        origin: "Italy / Portugal",
        wrinkle: "low",
        tier: "S-/A+",
        confidence: "verified",
      },
      {
        product: "Norse Standard Oxford BD Shirt",
        category: "shirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: null,
        weave: "oxford",
        construction: ["mother-of-pearl"],
        origin: "Portugal",
        wrinkle: "high",
        tier: "S",
        confidence: "verified",
      },
      {
        product: "Ulriken Cotton-Linen Twill Shirt",
        category: "shirt",
        fiber: "cotton / linen twill (split 50/50 or 75/25 — to confirm)",
        fiberType: "generic",
        gsm: null,
        weave: "twill",
        construction: ["corozo"],
        origin: "Romania",
        wrinkle: "high",
        tier: "S-/A+",
        confidence: "partial",
      },
    ],
  },
  {
    name: "Merz b. Schwanen",
    domains: ["merzbschwanen.com"],
    products: [
      {
        product: "215 Loopwheeled T-Shirt",
        category: "tshirt",
        fiber: "100% GOTS organic cotton",
        fiberType: "organic",
        gsm: 244, // 7.2 oz/yd^2; midweight structured (not heavyweight) — KB §7
        weave: "jersey",
        construction: ["loopwheeled"],
        origin: "Germany (Albstadt)",
        wrinkle: "low",
        tier: "S+",
        confidence: "verified",
      },
      {
        product: "Worker's Cotton Twill Shirt",
        category: "shirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: 200,
        weave: "twill",
        construction: ["corozo"],
        origin: "Portugal",
        wrinkle: "high",
        tier: "S",
        confidence: "verified",
      },
    ],
  },
  {
    name: "SANVT",
    domains: ["sanvt.com"],
    products: [
      {
        product: "The Perfect T-Shirt",
        category: "tshirt",
        fiber: "Extra-long-staple cotton",
        fiberType: "long-staple",
        gsm: 185,
        weave: "jersey",
        construction: [],
        origin: null,
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "The Heavyweight T-Shirt",
        category: "tshirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: 235,
        weave: "jersey",
        construction: [],
        origin: null,
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
    ],
  },
  {
    name: "Hollister",
    domains: ["hollisterco.com"],
    products: [
      {
        product: "Boxy Heavyweight Cotton Crew T-Shirt",
        category: "tshirt",
        fiber: "100% cotton",
        fiberType: "generic",
        gsm: 235, // washed variants reach 250 — verify per SKU (KB §7)
        weave: "jersey",
        construction: [],
        origin: null,
        wrinkle: "low",
        tier: "A-",
        confidence: "verified",
      },
    ],
  },
  {
    name: "Vans",
    domains: ["vans.com"],
    products: [
      {
        product: "Premium T-Shirt",
        category: "tshirt",
        fiber: "100% cotton",
        fiberType: "generic",
        gsm: null, // not published
        weave: "jersey",
        construction: [],
        origin: null,
        wrinkle: "low",
        tier: "B",
        confidence: "partial",
      },
    ],
  },
  {
    name: "UNIQLO",
    domains: ["uniqlo.com"],
    products: [
      {
        product: "Supima Cotton T-Shirt",
        category: "tshirt",
        fiber: "100% Supima cotton",
        fiberType: "Supima",
        gsm: null, // not published
        weave: "jersey",
        construction: [],
        origin: null,
        wrinkle: "low",
        tier: "A",
        confidence: "partial",
      },
    ],
  },
];

// Match a URL host against the audited brands (suffix match so subdomains and
// country shops like "www.asket.com" / "shop.brand.com" match).
export function matchBrandByHost(host: string): AuditedBrand | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  return (
    AUDITED_BRANDS.find((b) =>
      b.domains.some((d) => h === d || h.endsWith(`.${d}`)),
    ) ?? null
  );
}
