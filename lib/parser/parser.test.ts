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
    expect(r.score.band).toBe("high");
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
    expect(r.score.band).toBe("high");
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
});

describe("parser — scoring & wrinkle edge cases", () => {
  it("does NOT infer GSM from 'heavyweight' (golden rule)", () => {
    const r = parse("Heavyweight t-shirt. 100% cotton. Premium quality.");
    expect(r.findings.gsm.value).toBeNull();
    expect(r.missing).toContain("gsm");
  });

  it("penalizes high polyester and lands low band", () => {
    const r = parse("T-shirt. 50% cotton 50% polyester.");
    expect(r.findings.polyester.value).toBe(50);
    expect(r.score.band).toBe("low");
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

  it("returns unknown category with no garment keywords", () => {
    const r = parse("Some fabric. 100% cotton.");
    expect(r.category).toBe("unknown");
    expect(r.categoryConfidence).toBe("low");
  });

  it("button cue disambiguates a shirt that also says t-shirt-ish words", () => {
    const r = parse("Oxford button-down shirt with buttons. 100% cotton. Oxford.");
    expect(r.category).toBe("shirt");
  });
});
