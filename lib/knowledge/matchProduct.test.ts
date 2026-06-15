import { describe, it, expect } from "vitest";
import { matchAuditedProduct } from "./matchProduct";

describe("matchAuditedProduct (Fase B / decisão #4)", () => {
  it("matches a product via a distinctive slug token", () => {
    const m = matchAuditedProduct({
      host: "norseprojects.com",
      url: "https://norseprojects.com/products/norse-standard-heavy-loose-t-shirt-white",
      category: "tshirt",
    });
    expect(m?.matchLevel).toBe("product");
    expect(m?.product?.product).toBe("Heavy Loose T-Shirt");
  });

  it("distinguishes SANVT Perfect from Heavyweight (distinctive token, not 'the'+'t-shirt')", () => {
    const perfect = matchAuditedProduct({
      host: "sanvt.com",
      url: "https://sanvt.com/products/the-perfect-t-shirt-white",
      category: "tshirt",
    });
    expect(perfect?.matchLevel).toBe("product");
    expect(perfect?.product?.product).toBe("The Perfect T-Shirt");

    const heavy = matchAuditedProduct({
      host: "sanvt.com",
      url: "https://sanvt.com/products/the-heavyweight-t-shirt-black",
      category: "tshirt",
    });
    expect(heavy?.product?.product).toBe("The Heavyweight T-Shirt");
  });

  it("matches Asket Overshirt by its distinctive token", () => {
    const m = matchAuditedProduct({
      host: "www.asket.com",
      url: "https://www.asket.com/en/mens-overshirt-beige",
      category: "shirt",
    });
    expect(m?.matchLevel).toBe("product");
    expect(m?.product?.product).toBe("The Overshirt");
  });

  it("falls back to category-unique when the name has no distinctive token", () => {
    // "The T-Shirt" has no distinctive token; Asket has one tshirt -> category.
    const m = matchAuditedProduct({
      host: "www.asket.com",
      url: "https://www.asket.com/en/mens-t-shirt-white",
      category: "tshirt",
    });
    expect(m?.matchLevel).toBe("category");
    expect(m?.product?.product).toBe("The T-Shirt");
  });

  it("falls back to brand-level when ambiguous (no distinctive token, many in category)", () => {
    // Buck Mason has 4 tshirts; a generic slug ties -> brand-level, no product.
    const m = matchAuditedProduct({
      host: "buckmason.com",
      url: "https://buckmason.com/products/t-shirt",
      category: "tshirt",
    });
    expect(m?.matchLevel).toBe("brand");
    expect(m?.product).toBeNull();
  });

  it("carries confidence: partial for a partial-tier product", () => {
    // Kiton has a single shirt with confidence: "partial".
    const m = matchAuditedProduct({
      host: "kiton.com",
      url: "https://kiton.com/camicia-cotone",
      category: "shirt",
    });
    expect(m?.product?.confidence).toBe("partial");
  });

  it("returns null for an unaudited host", () => {
    expect(
      matchAuditedProduct({
        host: "www.zara.com",
        url: "https://www.zara.com/x",
        category: "tshirt",
      }),
    ).toBeNull();
  });
});
