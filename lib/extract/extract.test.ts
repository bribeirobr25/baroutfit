import { describe, it, expect, vi, afterEach } from "vitest";
import { extractText, categoryFromUrl, hasFabricSignal, fetchPage, focusReaderText } from "./index";
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

  it("handles +/_ slug separators (e.g. 'T+Shirt')", () => {
    expect(
      categoryFromUrl(
        "https://www.blue-tomato.com/en-GB/product/Shaka+Wear-Max+Heavyweight+T+Shirt-690618/",
      ),
    ).toBe("tshirt");
    expect(categoryFromUrl("https://shop.com/p/heavy_t_shirt")).toBe("tshirt");
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

describe("hasFabricSignal", () => {
  it("detects composition / GSM / fiber signals", () => {
    expect(hasFabricSignal("Composition: 100% cotton")).toBe(true);
    expect(hasFabricSignal("235 GSM heavyweight")).toBe(true);
    expect(hasFabricSignal("Made in Portugal. Boxy fit.")).toBe(false);
  });
});

describe("fetchPage reader fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the reader proxy when the direct fetch is blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const u = String(input);
        if (u.startsWith("https://r.jina.ai/")) {
          // Reader renders the JS and returns the real composition.
          return new Response(
            "Boxy fit check shirt. Composition: 100% cotton.",
            { status: 200, headers: { "content-type": "text/plain" } },
          );
        }
        // Direct fetch is blocked by datacenter-IP anti-bot.
        return new Response("blocked", { status: 403 });
      }),
    );

    const r = await fetchPage(
      "https://www.zara.com/de/en/boxy-fit-check-shirt-p01820350.html",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.extract.text.toLowerCase()).toContain("100% cotton");
      const parsed = parse(r.extract.text, { categoryHint: r.extract.categoryHint });
      expect(parsed.category).toBe("shirt");
      expect(parsed.findings.fiber.value).toBe("100% cotton");
    }
  });

  it("stays unreadable when both direct and reader fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 403 })),
    );
    const r = await fetchPage("https://www.hollisterco.com/p/blocked");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("anti-bot");
  });
});

describe("focusReaderText", () => {
  it("windows around the real composition, excluding far-away noise", () => {
    const far = "shoes bag scarf ".repeat(120); // ~1900 chars, beyond the window
    const text = `Nav ${far} Product details. Composition: 100% cotton. Care: machine wash. ${far} Related: denim jacket ${far}`;
    const focused = focusReaderText(text);
    expect(focused.toLowerCase()).toContain("100% cotton");
    expect(focused.toLowerCase()).not.toContain("denim");
  });

  it("falls back to the top of the page when no composition anchor exists", () => {
    const text = "A".repeat(5000);
    expect(focusReaderText(text).length).toBeLessThanOrEqual(1500);
  });
});
