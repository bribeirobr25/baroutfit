import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { ResultCard, Lightbox } from "./ResultCard";
import { en as enDict } from "@/lib/i18n/dictionaries/en";
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

describe("ResultCard — image gallery (G2)", () => {
  it("renders all images via the same-origin proxy, with thumbnails + arrows when >=3", () => {
    const out = html(
      ok({ images: ["https://cdn.x/1.jpg", "https://cdn.x/2.jpg", "https://cdn.x/3.jpg"] }),
    );
    expect(out).toContain(`/api/image?src=${encodeURIComponent("https://cdn.x/1.jpg")}`);
    expect(out).toContain(`/api/image?src=${encodeURIComponent("https://cdn.x/3.jpg")}`);
    expect(out).toContain('loading="eager"'); // first slide eager
    expect(out).toContain('loading="lazy"'); // the rest lazy
    expect(out).toContain('aria-roledescription="gallery"');
    expect(out).toContain("Previous image"); // arrow aria-label (multi)
    expect(out).toContain("Next image");
    expect(out).toContain("Image 1"); // thumbnail aria-label (>=3 -> thumbnails)
    expect(out).toContain("cursor-zoom-in"); // slides open the lightbox (G3)
    // Lightbox is closed by default → portal never renders in static markup
    // (SSR-safe: createPortal is not called during renderToStaticMarkup).
    expect(out).not.toContain('role="dialog"');
  });

  it("single image: no arrows, no thumbnails/dots", () => {
    const out = html(ok({ images: ["https://cdn.x/only.jpg"] }));
    expect(out).toContain(`/api/image?src=${encodeURIComponent("https://cdn.x/only.jpg")}`);
    expect(out).not.toContain("Previous image"); // single -> no nav
  });

  it("renders no gallery when there are no images, but an honest empty-state (M3)", () => {
    const out = html(ok({}));
    expect(out).not.toContain("/api/image");
    // Not silence: the user is told the photo wasn't read.
    expect(out).toContain("No photo came through.");
  });
});

describe("ResultCard — open on the store link (G2)", () => {
  it("shows the store link with host when sourceUrl is provided", () => {
    const out = renderToStaticMarkup(
      <I18nProvider>
        <ResultCard data={ok({})} sourceUrl="https://www.norseprojects.com/products/x" />
      </I18nProvider>,
    );
    expect(out).toContain("Open on the store");
    expect(out).toContain("norseprojects.com"); // www stripped
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("hides the store link when no sourceUrl", () => {
    const out = html(ok({}));
    expect(out).not.toContain("Open on the store");
  });
});

describe("Lightbox markup (G3)", () => {
  const imgs = ["https://cdn.x/1.jpg", "https://cdn.x/2.jpg", "https://cdn.x/3.jpg"];
  const render = (index: number) =>
    renderToStaticMarkup(
      <Lightbox
        images={imgs}
        index={index}
        alt="T-shirt"
        dict={enDict}
        onClose={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );

  it("renders an accessible dialog with the proxied image + counter", () => {
    const out = render(1);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('aria-label="T-shirt"');
    expect(out).toContain("Close"); // close button label
    expect(out).toContain(`/api/image?src=${encodeURIComponent("https://cdn.x/2.jpg")}`);
    expect(out).toContain("2 / 3"); // counter at index 1
  });

  it("hides prev at the first image and next at the last (clamped)", () => {
    const first = render(0);
    expect(first).not.toContain("Previous image");
    expect(first).toContain("Next image");
    const last = render(2);
    expect(last).toContain("Previous image");
    expect(last).not.toContain("Next image");
  });
});
