import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { ResultCard } from "./ResultCard";
import type { AnalyzeOk, BrandMatch } from "@/lib/types";

// Render-content validation for the decisão #4 reference block (stands in for
// browser visual checks). Renders the real component (en dict) and asserts the
// three provenances stay distinct and honest.

function ok(over: Partial<AnalyzeOk> = {}): AnalyzeOk {
  return {
    status: "ok",
    category: "tshirt",
    categoryConfidence: "high",
    findings: {
      fiber: { value: "100% organic cotton", verified: true },
      fiberType: { value: "organic", verified: true },
      gsm: { value: 260, verified: true },
      weave: { value: "jersey", verified: true },
      spinning: { value: null, verified: false },
      elastane: { value: null, verified: false },
      polyester: { value: null, verified: false },
      nonIron: { value: false, verified: false },
      construction: [],
    },
    missing: ["spinning"],
    score: { value: 49, band: "medium" },
    wrinkle: "low",
    brandMatch: null,
    recommendations: [],
    confidence: "verified",
    ...over,
  };
}

function html(data: AnalyzeOk): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <ResultCard data={data} />
    </I18nProvider>,
  );
}

describe("ResultCard — verified reference block (decisão #4)", () => {
  it("verified product match: page band + 'our rating' tier + 'verified at source' specs", () => {
    const brandMatch: BrandMatch = {
      name: "Norse Projects",
      noteKey: "result.brandMatch",
      ref: true,
      matchLevel: "product",
      reference: {
        product: "Heavy Loose T-Shirt",
        confidence: "verified",
        tier: "S+",
        fiber: "100% organic cotton",
        gsm: 260,
        weave: "jersey",
        origin: "Portugal",
        wrinkle: "low",
      },
    };
    const out = html(ok({ brandMatch }));
    expect(out).toContain("Honestly good"); // band = page read, NOT inflated to high
    expect(out).toContain("Our rating"); // judgment label
    expect(out).toContain("Top of the line"); // S+ -> top
    expect(out).toContain("Verified at source"); // fact label
    expect(out).toContain("260 g/m²");
    expect(out).toContain("Made in");
    expect(out).toContain("Portugal");
    expect(out).toContain("Heavy Loose T-Shirt");
  });

  it("partial match: soft note, tier shown as judgment, NO 'verified at source' stamp", () => {
    const brandMatch: BrandMatch = {
      name: "Kiton",
      noteKey: "result.brandMatch",
      ref: true,
      matchLevel: "category",
      reference: {
        product: "Camicia Cotone (white)",
        confidence: "partial",
        tier: "A+",
        fiber: "100% cotton",
        gsm: null,
        weave: "poplin",
        origin: "Italy",
        wrinkle: "high",
      },
    };
    const out = html(ok({ category: "shirt", brandMatch }));
    expect(out).toContain("Our rating");
    expect(out).toContain("Excellent"); // A+ -> high
    expect(out).toContain("Partial reference"); // soft label
    expect(out).not.toContain("Verified at source"); // specs not stamped verified
  });

  it("brand-level match: generic Audited note, no tier/specs", () => {
    const brandMatch: BrandMatch = {
      name: "Buck Mason",
      noteKey: "result.brandMatch",
      ref: true,
      matchLevel: "brand",
    };
    const out = html(ok({ brandMatch }));
    expect(out).toContain("Audited");
    expect(out).not.toContain("Our rating");
    expect(out).not.toContain("Verified at source");
  });

  it("no brand match: no audited block at all", () => {
    const out = html(ok({ brandMatch: null }));
    expect(out).not.toContain("Audited");
    expect(out).not.toContain("Our rating");
  });
});

describe("ResultCard — image gallery (A3)", () => {
  it("renders up to 4 images via the same-origin proxy (capped)", () => {
    const out = html(
      ok({
        images: [
          "https://cdn.x/1.jpg",
          "https://cdn.x/2.jpg",
          "https://cdn.x/3.jpg",
          "https://cdn.x/4.jpg",
          "https://cdn.x/5.jpg",
        ],
      }),
    );
    const imgs = out.match(/<img /g) ?? [];
    expect(imgs.length).toBe(4); // capped at 4 in the UI
    expect(out).toContain(
      `/api/image?src=${encodeURIComponent("https://cdn.x/1.jpg")}`,
    );
    expect(out).toContain('loading="eager"'); // first image eager
    expect(out).toContain('loading="lazy"'); // the rest lazy
  });

  it("renders no gallery when there are no images", () => {
    expect(html(ok({}))).not.toContain("/api/image");
  });
});
