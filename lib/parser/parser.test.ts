import { describe, it, expect } from "vitest";
import { parse } from "./index";

// Representative product-page text fixtures. The real-HTML extraction is tested
// in Phase 3; here we validate the parsing/scoring logic and multi-language
// token matching (PARSER §8).

describe("parser — PARSER §8 cases", () => {
  it("Asket The T-Shirt: tshirt, organic long-staple, 180 GSM, verified, wrinkle low", () => {
    const r = parse(
      "Asket The T-Shirt. 100% organic cotton, long staple. Compact single jersey. 180 GSM. Made in Portugal. Twin-needle hems.",
    );
    expect(r.category).toBe("tshirt");
    expect(r.categoryConfidence).toBe("high");
    expect(r.findings.fiberType.value).toBe("long-staple");
    expect(r.findings.gsm.value).toBe(180);
    expect(r.findings.gsm.verified).toBe(true);
    expect(r.findings.spinning.value).toBe("compact");
    expect(r.findings.construction).toContain("twin-needle stitching");
    expect(r.wrinkle).toBe("low");
    expect(r.confidence).toBe("verified");
    expect(r.score.band).toBe("high");
  });

  it("Asket The Overshirt: shirt, 308 GSM two-ply twill, corozo, verified, wrinkle high", () => {
    const r = parse(
      "Asket The Overshirt. 100% organic cotton. 308 GSM two-ply twill. Corozo buttons. Milled in Italy, cut and sewn in Portugal.",
    );
    expect(r.category).toBe("shirt");
    expect(r.findings.gsm.value).toBe(308);
    expect(r.findings.weave.value).toBe("twill");
    expect(r.findings.construction).toEqual(
      expect.arrayContaining(["corozo buttons", "two-ply"]),
    );
    expect(r.wrinkle).toBe("high");
    expect(r.confidence).toBe("verified");
    // A2: organic generic-staple cotton is not a premium fiber, so even a
    // heavyweight twill overshirt with corozo is "honestly good", not "the real
    // thing" — the editorial S+ tier rides on the KB seal, not the computed band.
    expect(r.score.band).toBe("medium");
  });

  it("Norse Falster: shirt, 50/50 cotton/TENCEL, poplin, wrinkle low (TENCEL), verified", () => {
    const r = parse(
      "Norse Projects Falster Oversize Shirt. 50% cotton 50% TENCEL. Poplin. Mother-of-pearl buttons. Made in Portugal.",
    );
    expect(r.category).toBe("shirt");
    expect(r.findings.fiberType.value).toBe("TENCEL");
    expect(r.findings.weave.value).toBe("poplin");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.missing).toContain("gsm");
    expect(r.wrinkle).toBe("low");
    expect(r.confidence).toBe("verified"); // fiber + weave present
  });

  it("Hollister Boxy Heavyweight: tshirt, 235 GSM, no premium fiber, wrinkle low, verified", () => {
    const r = parse(
      "Hollister Boxy Heavyweight Cotton Crew T-Shirt. 100% cotton. 235 GSM. Boxy fit. Imported.",
    );
    expect(r.category).toBe("tshirt");
    expect(r.findings.gsm.value).toBe(235);
    expect(r.findings.fiberType.value).toBe("generic");
    expect(r.wrinkle).toBe("low");
    expect(r.confidence).toBe("verified");
    expect(r.score.band).toBe("medium"); // good GSM but generic fiber, no premium signals
  });

  it("Zara-style page without GSM: partial confidence, indeterminate score", () => {
    const r = parse("Camiseta básica. 100% algodão.");
    expect(r.category).toBe("tshirt");
    expect(r.findings.fiber.value).toBe("100% cotton");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.confidence).toBe("partial");
    expect(r.score.band).toBe("indeterminate");
    expect(r.wrinkle).toBe("low"); // knit category
  });
});

describe("parser — multi-language tokens", () => {
  it("German: Hemd, Baumwolle, bügelfrei, g/m²", () => {
    const r = parse("Herren Hemd. 100% Baumwolle. Bügelfrei. Twill. 140 g/m².");
    expect(r.category).toBe("shirt");
    expect(r.findings.fiber.value).toBe("100% cotton");
    expect(r.findings.nonIron.value).toBe(true);
    expect(r.findings.weave.value).toBe("twill");
    expect(r.findings.gsm.value).toBe(140);
    expect(r.wrinkle).toBe("low"); // non-iron
  });

  it("Spanish: camisa, algodón, oxford, nácar", () => {
    const r = parse("Camisa de algodón. 100% algodón. Oxford. Botones de nácar.");
    expect(r.category).toBe("shirt");
    expect(r.findings.fiber.value).toBe("100% cotton");
    expect(r.findings.weave.value).toBe("oxford");
    expect(r.findings.construction).toContain("mother-of-pearl buttons");
    expect(r.wrinkle).toBe("high"); // woven cotton, untreated
  });

  it("converts oz/yd² to g/m² and flags loopwheeled (Merz 215)", () => {
    const r = parse(
      "Merz b. Schwanen 215 Loopwheeled T-Shirt. 100% GOTS organic cotton. Loopwheeled in Germany. 7.2 oz/sq.yd.",
    );
    expect(r.category).toBe("tshirt");
    expect(r.findings.gsm.value).toBe(244); // 7.2 * 33.906
    expect(r.findings.gsm.verified).toBe(true);
    expect(r.findings.gsm.note).toMatch(/oz/);
    expect(r.findings.spinning.value).toBe("loopwheeled");
    expect(r.wrinkle).toBe("low");
    // A2: GOTS organic (generic-staple) cotton — loopwheeled + heavyweight earn
    // "honestly good", not "high" (high requires a premium fiber).
    expect(r.score.band).toBe("medium");
  });
});

describe("parser — pullover & hoodie categories", () => {
  it("pullover: moletom, french terry, 400 g/m², wrinkle low", () => {
    const r = parse("Moletom de algodão. 100% cotton. French Terry. 400 g/m².");
    expect(r.category).toBe("pullover");
    expect(r.findings.weave.value).toBe("french-terry");
    expect(r.findings.gsm.value).toBe(400);
    expect(r.wrinkle).toBe("low");
  });

  it("hoodie: Kapuzenpullover, french terry, 450 g/m²", () => {
    const r = parse(
      "Kapuzenpullover. 100% Baumwolle. French Terry. 450 g/m².",
    );
    expect(r.category).toBe("hoodie");
    expect(r.findings.gsm.value).toBe(450);
    expect(r.wrinkle).toBe("low");
  });

  it("hoodie wins over sweatshirt when a hood cue is present", () => {
    const r = parse("Hooded sweatshirt. 100% cotton. 420 g/m².");
    expect(r.category).toBe("hoodie");
  });

  it("hood cue beats pullover even when 'sweatshirt' is repeated more", () => {
    const r = parse(
      "Sweatshirt. Heavy sweatshirt. Premium hooded sweatshirt. 100% cotton. 420 g/m².",
    );
    expect(r.category).toBe("hoodie");
  });
});

describe("parser — scoring & wrinkle edge cases", () => {
  it("does NOT infer GSM from 'heavyweight' (golden rule)", () => {
    const r = parse("Heavyweight t-shirt. 100% cotton. Premium quality.");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.missing).toContain("gsm");
  });

  it("abstains on a 50/50 cotton/polyester blend (no in-scope majority)", () => {
    // A1: in-scope sum is 50% < 60%, so we don't fake a grade — out-of-scope,
    // never the old confident "low" (CLAUDE.md §1).
    const r = parse("T-shirt. 50% cotton 50% polyester.");
    expect(r.findings.polyester.value).toBe(50);
    expect(r.score.band).toBe("out-of-scope");
  });

  it("cotton + 5% elastane woven shirt wrinkles medium", () => {
    const r = parse("Camisa. 95% cotton 5% elastane. Twill.");
    expect(r.findings.elastane.value).toBe(5);
    expect(r.wrinkle).toBe("medium");
  });

  it("good fiber alone (no GSM/weave/construction) is indeterminate, NOT low", () => {
    // Real-world case: a page exposes only "100% organic cotton, long staple"
    // with no corroborating data. Missing data must not read as low quality.
    const r = parse("Premium tee. 100% organic cotton, long staple.");
    expect(r.findings.fiberType.value).toBe("long-staple");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.score.band).toBe("indeterminate");
    expect(r.confidence).toBe("partial");
  });

  it("fiber TYPE + GSM (no composition %) counts as verified confidence", () => {
    // SANVT-style page: states "ELS cotton" + "185 GSM" but no "100% cotton".
    const r = parse("The Perfect T-Shirt. ELS cotton. 185 GSM.");
    expect(r.findings.fiber.value).toBeNull(); // no NN% string
    expect(r.findings.fiberType.value).toBe("long-staple");
    expect(r.findings.gsm.value).toBe(185);
    expect(r.confidence).toBe("verified");
  });

  it("light GSM generic tee lands low", () => {
    const r = parse("Basic t-shirt. 100% cotton. Jersey. 130 g/m².");
    expect(r.findings.gsm.value).toBe(130);
    expect(r.score.band).toBe("low");
  });

  it("plain cotton jersey tee with NO GSM is indeterminate, not low (audit 2026-06-16)", () => {
    // jersey is the default tee knit -> it alone must not corroborate quality.
    // Without GSM there is no negative evidence, so the honest verdict is "not
    // enough data", never "low".
    const r = parse("Regular fit t-shirt. 100% cotton. Jersey knit.");
    expect(r.findings.weave.value).toBe("jersey");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.score.band).toBe("indeterminate");
  });

  // Evidence model (P1, audit 2026-06-16): `low` requires NAMED negative
  // evidence; absence -> indeterminate. nonIron / a lone construction token do
  // not corroborate quality.
  it("non-iron generic shirt with no GSM is indeterminate, not low", () => {
    const r = parse("Non-iron dress shirt. 100% cotton.");
    expect(r.findings.nonIron.value).toBe(true);
    expect(r.score.band).toBe("indeterminate");
  });

  it("a single construction token alone is indeterminate, not low (decision #3)", () => {
    const r = parse("Cotton t-shirt. 100% cotton. Twin-needle stitching.");
    expect(r.findings.construction).toContain("twin-needle stitching");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.score.band).toBe("indeterminate");
  });

  it("generic shirt: informative weave + construction, no GSM -> medium, not low", () => {
    // Kiton-class: previously a FALSE 'low'; now 'honestly good' (corroborated,
    // no negative evidence). The audited-brand block surfaces the real tier.
    const r = parse("Camicia. 100% cotton. Poplin. Mother-of-pearl buttons.");
    expect(r.findings.weave.value).toBe("poplin");
    expect(r.score.band).toBe("medium");
  });

  it("genuinely light-GSM generic tee still reads low (negative evidence survives)", () => {
    // Guard: removing value<25 must NOT let real light fabric ride up to medium.
    const r = parse("Lightweight cotton t-shirt. 100% cotton. Jersey. 140 g/m².");
    expect(r.findings.gsm.value).toBe(140);
    expect(r.score.value).toBeGreaterThanOrEqual(25); // proves it's NOT via value<25
    expect(r.score.band).toBe("low");
  });

  it("polyester-dominant blend abstains (out-of-scope), wrinkle still answered", () => {
    const r = parse("1/4 zip work shirt. 65% polyester, 35% cotton.");
    expect(r.findings.polyester.value).toBe(65);
    expect(r.findings.fiber.value).toBe("65% polyester, 35% cotton");
    expect(r.wrinkle).toBe("low"); // wrinkle verdict is universal: synthetic resists
    expect(r.score.band).toBe("out-of-scope"); // we don't grade synthetics yet
  });

  it("returns unknown category with no garment keywords", () => {
    const r = parse("Some fabric. 100% cotton.");
    expect(r.category).toBe("unknown");
    expect(r.categoryConfidence).toBe("low");
  });

  it("button cue disambiguates a shirt that also says t-shirt-ish words", () => {
    const r = parse("Oxford button-down shirt with buttons. 100% cotton. Oxford.");
    expect(r.category).toBe("shirt");
  });

  it("a single stray 'hoodie' mention does not beat many 'shirt' mentions", () => {
    const noisy = "shirt shirt shirt boxy fit shirt check shirt. hoodie. 100% cotton.";
    const r = parse(noisy);
    expect(r.category).toBe("shirt");
  });

  it("does NOT read composition from marketing prose", () => {
    // SANVT-style sentence: "...1% of the global cotton production..." must not
    // become a 1% cotton finding (it's prose, not a composition).
    const r = parse(
      "The Perfect T-Shirt. ELS cotton represents only 1% of the global cotton production. 185 GSM.",
    );
    expect(r.findings.fiber.value).toBeNull(); // no false "1% cotton"
    expect(r.findings.gsm.value).toBe(185);
    expect(r.findings.fiberType.value).toBe("long-staple");
  });

  it("still reads composition with real fiber qualifiers (organic, ELS)", () => {
    expect(parse("100% organic cotton").findings.fiber.value).toBe("100% cotton");
    expect(
      parse("95% extra long staple cotton, 5% elastane").findings.fiber.value,
    ).toBe("95% cotton, 5% elastane");
  });

  it("dedupes a composition that repeats across the page", () => {
    // Same block appears in JSON-LD + visible + meta -> must not repeat.
    const r = parse(
      "Tee. 100% cotton. ... 100% cotton ... Composition: 100% cotton. 100% cotton.",
    );
    expect(r.findings.fiber.value).toBe("100% cotton");
  });

  it("extracts composition followed by markdown image syntax", () => {
    // Reader (markdown) case: "100% cotton ![Image...](...)".
    const r = parse("Boxy shirt. Composition: 100% cotton ![Image 7](https://x/y.jpg)");
    expect(r.findings.fiber.value).toBe("100% cotton");
  });

  it("URL hint is authoritative for category over noisy text", () => {
    // Text says hoodie a lot, but the product slug says shirt.
    const r = parse("hoodie hoodie kapuzenpullover. 100% cotton.", {
      categoryHint: "shirt",
    });
    expect(r.category).toBe("shirt");
    expect(r.categoryConfidence).toBe("low"); // text disagrees -> low
  });
});

describe("parser — Fase A abstention (out-of-scope fibers)", () => {
  it("100% polyester abstains, not low", () => {
    const r = parse("Performance tee. 100% polyester. Jersey. 160 g/m².");
    expect(r.score.band).toBe("out-of-scope");
    expect(r.findings.polyester.value).toBe(100);
  });

  it("100% silk abstains (silk is now recognized, just not graded)", () => {
    const r = parse("Silk shirt. 100% silk. Made in Italy.");
    expect(r.findings.fiber.value).toBe("100% silk");
    expect(r.score.band).toBe("out-of-scope");
  });

  it("100% linen abstains (was wrongly 'low' before), wrinkle still high", () => {
    const r = parse("Linen shirt. 100% linen. 160 g/m².");
    expect(r.score.band).toBe("out-of-scope");
    expect(r.wrinkle).toBe("high"); // wrinkle verdict still answered
  });

  it("non-merino wool and viscose abstain", () => {
    expect(parse("Wool jumper. 100% wool.").score.band).toBe("out-of-scope");
    expect(parse("Dress. 100% viscose.").score.band).toBe("out-of-scope");
  });

  it("KEY: 50/50 cotton/TENCEL stays IN-SCOPE (sum of in-scope ≥ 60%)", () => {
    // The corrected blend rule: two in-scope fibers sum to 100% -> graded, not
    // abstained. Regression guard for Norse Falster (audited A+).
    const r = parse("Shirt. 50% cotton 50% TENCEL. Poplin. 120 g/m².");
    expect(r.score.band).not.toBe("out-of-scope");
    expect(r.findings.fiberType.value).toBe("TENCEL");
  });

  it("60/40 cotton/poly is in-scope; 55/45 is out-of-scope", () => {
    expect(parse("Tee. 60% cotton 40% polyester. 200 g/m².").score.band).not.toBe(
      "out-of-scope",
    );
    expect(parse("Tee. 55% cotton 45% polyester. 200 g/m².").score.band).toBe(
      "out-of-scope",
    );
  });

  it("merino wool is in-scope (graded, not abstained)", () => {
    const r = parse("Merino tee. 100% merino wool. 180 g/m².");
    expect(r.score.band).not.toBe("out-of-scope");
    expect(r.findings.fiberType.value).toBe("merino");
  });

  it("no composition read is indeterminate, not out-of-scope", () => {
    // Abstention requires knowing the fiber; absence of data stays indeterminate.
    const r = parse("Heavyweight tee. Premium quality. 100% authentic.");
    expect(r.score.band).not.toBe("out-of-scope");
  });
});
