import { describe, it, expect, vi, afterEach } from "vitest";
import {
  extractText,
  categoryFromUrl,
  hasFabricSignal,
  fetchPage,
  focusReaderText,
  assertSafeUrl,
  isReservedAddress,
} from "./index";
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

  it("reads JSON-LD Product material but ignores BreadcrumbList categories", () => {
    // The breadcrumb names a "Denim" category; a related card mentions denim.
    // Neither must become a finding — only the Product's own material counts.
    const html = `<html><head>
      <script type="application/ld+json">
        {"@graph":[
          {"@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","name":"Shirts"},{"@type":"ListItem","name":"Denim & Work"}]},
          {"@type":"Product","name":"Zip Work Shirt","material":"65% polyester, 35% cotton"}
        ]}
      </script></head><body>
        <main><h1>Zip Work Shirt</h1><div class="product-detail">65% polyester, 35% cotton</div></main>
        <section class="product-card"><h2>Selvedge Denim Jacket</h2></section>
      </body></html>`;
    const r = extractText(html, "https://shop.com/p/zip-work-shirt");
    expect(r.text.toLowerCase()).toContain("65% polyester");
    expect(r.text.toLowerCase()).not.toContain("denim");
    const parsed = parse(r.text, { categoryHint: r.categoryHint });
    expect(parsed.findings.weave.value).toBeNull(); // no false "denim" weave
    expect(parsed.findings.polyester.value).toBe(65);
  });

  it("inserts spaces between block elements so adjacent text doesn't glue", () => {
    const html = `<html><body><main>
      <ul class="product-detail"><li>35% cotton</li></ul><p>Imported</p>
      </main></body></html>`;
    const r = extractText(html, "https://shop.com/p/tee");
    expect(r.text.toLowerCase()).not.toContain("cottonimported");
    expect(parse(r.text).findings.fiber.value).toContain("35% cotton");
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

describe("SSRF guard", () => {
  it("flags private / reserved IP literals", () => {
    expect(isReservedAddress("127.0.0.1")).toBe(true); // loopback
    expect(isReservedAddress("169.254.169.254")).toBe(true); // cloud metadata
    expect(isReservedAddress("10.0.0.5")).toBe(true); // private
    expect(isReservedAddress("192.168.1.1")).toBe(true); // private
    expect(isReservedAddress("172.16.0.1")).toBe(true); // private
    expect(isReservedAddress("::1")).toBe(true); // ipv6 loopback
    expect(isReservedAddress("fe80::1")).toBe(true); // ipv6 link-local
    expect(isReservedAddress("fc00::1")).toBe(true); // ipv6 ULA
  });

  it("allows public IP literals", () => {
    expect(isReservedAddress("8.8.8.8")).toBe(false);
    expect(isReservedAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("rejects non-web schemes, ports and internal hosts (no DNS needed)", async () => {
    expect(await assertSafeUrl("ftp://example.com")).toBe(false);
    expect(await assertSafeUrl("not a url")).toBe(false);
    expect(await assertSafeUrl("http://localhost/")).toBe(false);
    expect(await assertSafeUrl("http://127.0.0.1/")).toBe(false);
    expect(await assertSafeUrl("http://169.254.169.254/latest/meta-data")).toBe(
      false,
    );
    expect(await assertSafeUrl("http://[::1]/")).toBe(false);
    expect(await assertSafeUrl("http://example.com:22/")).toBe(false); // non-80/443 port
    expect(await assertSafeUrl("http://intranet/")).toBe(false); // bare host, no dot
  });

  it("allows a public IP literal URL", async () => {
    expect(await assertSafeUrl("http://8.8.8.8/")).toBe(true);
  });

  it("fetchPage refuses an unsafe host before any egress", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const r = await fetchPage("http://169.254.169.254/latest/meta-data");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("blocked");
    expect(spy).not.toHaveBeenCalled(); // never reached the network
    vi.unstubAllGlobals();
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
