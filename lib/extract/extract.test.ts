import { describe, it, expect } from "vitest";
import { extractText, categoryFromUrl } from "./index";
import { parse } from "@/lib/parser";

describe("categoryFromUrl", () => {
  it("derives a category hint from the URL path", () => {
    expect(categoryFromUrl("https://www.asket.com/en/mens-t-shirt-white")).toBe(
      "tshirt",
    );
    expect(categoryFromUrl("https://www.asket.com/en/mens-overshirt-beige")).toBe(
      "shirt",
    );
    expect(categoryFromUrl("https://shop.com/products/cotton-hoodie")).toBe(
      "hoodie",
    );
    expect(categoryFromUrl("https://shop.com/p/heavy-sweatshirt")).toBe(
      "pullover",
    );
    expect(categoryFromUrl("https://shop.com/p/leather-belt")).toBe("unknown");
  });
});

describe("extractText", () => {
  it("pulls JSON-LD, meta and product text; ignores nav/footer/script", () => {
    const html = `
      <html><head>
        <title>The Overshirt — Beige</title>
        <meta name="description" content="100% organic cotton, 308 GSM two-ply twill." />
        <script type="application/ld+json">
          {"@type":"Product","name":"The Overshirt","material":"100% organic cotton",
           "description":"308 GSM twill with corozo buttons"}
        </script>
        <script>window.analytics = 1;</script>
      </head><body>
        <nav>Shirts T-Shirts Hoodies Sweatshirts</nav>
        <main><h1>The Overshirt</h1>
          <div class="product-composition">100% organic cotton</div>
          <div class="product-detail">308 GSM two-ply twill. Corozo buttons.</div>
        </main>
        <footer>Hoodies Sweatshirts Newsletter</footer>
      </body></html>`;
    const r = extractText(html, "https://www.asket.com/en/mens-overshirt-beige");
    expect(r.text.toLowerCase()).toContain("308 gsm");
    expect(r.text.toLowerCase()).toContain("corozo");
    expect(r.text).not.toContain("window.analytics");
    expect(r.categoryHint).toBe("shirt");

    // End-to-end through the parser.
    const parsed = parse(r.text, { categoryHint: r.categoryHint });
    expect(parsed.category).toBe("shirt");
    expect(parsed.findings.gsm.value).toBe(308);
    expect(parsed.findings.weave.value).toBe("twill");
    expect(parsed.findings.construction).toContain("corozo buttons");
  });

  it("flags thin pages and falls back to body text", () => {
    const html = `<html><head><title>Loading…</title></head>
      <body><div id="app"></div></body></html>`;
    const r = extractText(html, "https://spa.example.com/p/123");
    expect(r.thin).toBe(true);
  });
});
