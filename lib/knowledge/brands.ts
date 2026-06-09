// Audited brands — VERIFIED reference data from docs/KNOWLEDGE-BASE.md §7.
// Provenance differs by row:
//   - Original brands (Asket, Norse, Merz, SANVT, Hollister, Vans, UNIQLO):
//     from the report (docs/guides/relatorio_*), confirmed by the audit
//     (docs/audit/revisao_relatorio_marcas_2026-06-06.md).
//   - 2026-06-07 batch (Buck Mason, Maison Cornichon, ISTO.): from the
//     per-market cruzamentos (docs/guides/cruzamentos/), verified via official
//     web_fetch. See knowledge-base-candidatos-verificados.md for per-brand
//     method + the fact/judgement distinction (gsm/fiber/origin = fact;
//     tier = editorial judgement; wrinkle = guide inference unless brand-stated).
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
        origin: "Portugal",
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
        origin: "Portugal (yarn spun in Italy)",
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
  // --- Batch 2026-06-07 (from docs/guides/cruzamentos/, web_fetch official) ---
  {
    name: "Buck Mason",
    domains: ["buckmason.com"],
    products: [
      {
        product: "Pima Classic Tee",
        category: "tshirt",
        // Brand names it "Pima" but the collection tag says "Supima Cotton" —
        // we resolve to Supima (a judgement, not a literal product-name quote).
        fiber: "100% Supima cotton (long staple)",
        fiberType: "Supima",
        gsm: 140,
        weave: "jersey",
        construction: ["pre-washed"],
        origin: "USA (Mohnton, PA)",
        wrinkle: "low",
        tier: "A",
        confidence: "verified",
      },
      {
        product: "Toughknit Tee",
        category: "tshirt",
        fiber: "100% Supima cotton",
        fiberType: "Supima",
        gsm: 200,
        weave: "jersey",
        construction: ["pre-washed"],
        origin: "USA (Mohnton, PA)",
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "Field-Spec Heavy Tee",
        category: "tshirt",
        fiber: "100% cotton",
        fiberType: "generic",
        gsm: 310,
        weave: "jersey",
        construction: ["pre-washed"],
        origin: "Import (non-US)",
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "Slub Classic Tee",
        category: "tshirt",
        // "cotton grown in USA" (raw material) — NOT "made in USA" (the garment).
        fiber: "100% cotton (slub)",
        fiberType: "generic",
        gsm: 145,
        weave: "jersey",
        construction: ["pre-washed"],
        origin: "USA (cotton grown in USA)",
        wrinkle: "low",
        tier: "A",
        confidence: "verified",
      },
    ],
  },
  {
    name: "Maison Cornichon",
    domains: ["maisoncornichon.com"],
    products: [
      {
        product: "T-shirt Côte 195g",
        category: "tshirt",
        fiber: "100% organic cotton (GOTS)",
        fiberType: "organic",
        gsm: 195,
        // "côte 1x1" (ribbed) — Weave enum has no "ribbed", so jersey + note.
        weave: "jersey",
        construction: ["ribbed 1x1", "yarn 1/40"],
        origin: "France (Dordogne)",
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "T-shirt Jersey 290g",
        category: "tshirt",
        fiber: "100% organic cotton (GOTS)",
        fiberType: "organic",
        gsm: 290,
        weave: "jersey",
        construction: ["yarn 1/20", "heavyweight"],
        origin: "France (Dordogne)",
        // wrinkle "low" is brand-stated here ("tombé net et structuré,
        // se froisse peu"), not just inferred from knit.
        wrinkle: "low",
        tier: "S",
        confidence: "verified",
      },
    ],
  },
  {
    name: "ISTO.",
    domains: ["isto.pt"],
    products: [
      {
        product: "Supima T-Shirt",
        category: "tshirt",
        fiber: "100% Supima cotton (extra long staple)",
        fiberType: "Supima",
        gsm: 160,
        weave: "jersey",
        construction: ["pre-shrunk"],
        origin: "Portugal",
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      // Shirts (lote 2) — appended to the existing ISTO. brand.
      {
        product: "Oxford Shirt",
        category: "shirt",
        fiber: "100% organic cotton (GOTS)",
        fiberType: "organic",
        gsm: 175,
        weave: "oxford",
        construction: ["washed", "pre-shrunk", "box pleat"],
        origin: "Portugal (Somelos + DOCAS)",
        wrinkle: "high",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "Lightweight Flannel Shirt",
        category: "shirt",
        fiber: "100% organic cotton (GOTS)",
        fiberType: "organic",
        gsm: 140,
        weave: "flannel",
        construction: ["regular fit"],
        origin: "Portugal",
        wrinkle: "high",
        tier: "A",
        confidence: "verified",
      },
      {
        product: "Midweight Flannel Shirt",
        category: "shirt",
        fiber: "100% organic cotton (GOTS)",
        fiberType: "organic",
        gsm: 160,
        weave: "flannel",
        construction: [],
        origin: "Portugal",
        wrinkle: "high",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "Checked Flannel Shirt",
        category: "shirt",
        fiber: "100% organic cotton (GOTS)",
        fiberType: "organic",
        gsm: 200,
        weave: "flannel",
        construction: ["bio resin buttons"],
        origin: "Portugal",
        wrinkle: "high",
        tier: "A+",
        confidence: "verified",
      },
    ],
  },
  // --- Batch 2026-06-07 lote 2 (cruzamentos, official web_fetch) ---
  {
    name: "Asphalte",
    domains: ["asphalte.com"],
    products: [
      {
        product: "Chemise Chambray",
        category: "shirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: 155,
        weave: "chambray",
        construction: ["plain weave", "enzyme-washed"],
        origin: "Portugal",
        wrinkle: "high",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "Chemise Oxford (v4)",
        category: "shirt",
        fiber: "100% organic cotton",
        fiberType: "organic",
        gsm: 150,
        weave: "oxford",
        construction: ["button-down", "7 stitches/cm", "enzyme-washed"],
        origin: "France / Portugal",
        wrinkle: "high",
        tier: "A+",
        confidence: "verified",
      },
    ],
  },
  {
    name: "American Giant",
    domains: ["american-giant.com"],
    products: [
      {
        product: "Classic Tee",
        category: "tshirt",
        fiber: "100% American-grown Supima cotton",
        fiberType: "Supima",
        gsm: 129, // 3.8 oz/yd² × 33.906
        weave: "jersey",
        construction: ["3.8 oz/yd²"],
        origin: "USA",
        wrinkle: "low",
        tier: "A",
        confidence: "verified",
      },
      {
        product: "Slub Tee",
        category: "tshirt",
        fiber: "100% American-grown Supima cotton (heavyweight slub)",
        fiberType: "Supima",
        gsm: 207, // 6.1 oz/yd² × 33.906
        weave: "jersey",
        construction: ["6.1 oz/yd²", "slub"],
        origin: "USA",
        wrinkle: "low",
        tier: "A+",
        confidence: "verified",
      },
      {
        product: "Airy Supima Tee",
        category: "tshirt",
        fiber: "100% American-grown Supima cotton",
        fiberType: "Supima",
        gsm: 102, // 3 oz/yd² × 33.906
        weave: "jersey",
        construction: ["3 oz/yd²"],
        origin: "USA",
        wrinkle: "low",
        tier: "A-",
        confidence: "verified",
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
