import { describe, it, expect, vi, afterEach } from "vitest";
import {
  extractText,
  categoryFromUrl,
  hasFabricSignal,
  hasFiberSignal,
  hasGsmSignal,
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

describe("extractText — images (A) & embedded JSON (B)", () => {
  it("collects multiple images (JSON-LD gallery + og), deduped, drops svg/data", () => {
    const ld = JSON.stringify({
      "@type": "Product",
      name: "Tee",
      image: ["https://cdn.x/1.jpg", "https://cdn.x/2.jpg", "https://cdn.x/logo.svg"],
    });
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.x/2.jpg">
      <meta name="twitter:image" content="data:image/png;base64,AAAA">
      <script type="application/ld+json">${ld}</script>
      </head><body><h1>Tee</h1><p>100% cotton</p></body></html>`;
    const r = extractText(html, "https://shop.com/p/tee");
    // svg dropped, data: dropped, og 2.jpg deduped vs JSON-LD
    expect(r.images).toEqual(["https://cdn.x/1.jpg", "https://cdn.x/2.jpg"]);
  });

  it("resolves a relative image URL against the page", () => {
    const html = `<html><head><meta property="og:image" content="/img/a.jpg"></head><body><h1>x</h1><p>100% cotton</p></body></html>`;
    const r = extractText(html, "https://shop.com/p/tee");
    expect(r.images?.[0]).toBe("https://shop.com/img/a.jpg");
  });

  it("collects gallery <img> (src/srcset/data-src) but not related/nav images (P2.2)", () => {
    const html = `<html><head></head><body><main>
      <div class="product-gallery">
        <a href="/zoom"><img src="https://cdn.x/g1.jpg"></a>
        <img data-src="https://cdn.x/g2.jpg">
        <img srcset="https://cdn.x/g3-400.jpg 400w, https://cdn.x/g3-800.jpg 800w">
      </div>
      <p>100% cotton</p>
      <section class="related-products"><img src="https://cdn.x/neighbour.jpg"></section>
      <nav><img src="https://cdn.x/logo.jpg"></nav>
      </main></body></html>`;
    const r = extractText(html, "https://shop.com/p/tee");
    expect(r.images).toEqual([
      "https://cdn.x/g1.jpg",
      "https://cdn.x/g2.jpg",
      "https://cdn.x/g3-400.jpg",
    ]);
    expect(r.images).not.toContain("https://cdn.x/neighbour.jpg");
    expect(r.images).not.toContain("https://cdn.x/logo.jpg");
  });

  it("reads composition from an embedded JSON island (key-targeted)", () => {
    const next = JSON.stringify({
      props: { product: { composition: "95% cotton 5% elastane", unrelated: "noise" } },
    });
    const html = `<html><body><h1>Tee</h1>
      <script id="__NEXT_DATA__" type="application/json">${next}</script>
      </body></html>`;
    const r = extractText(html, "https://shop.com/p/tee");
    const p = parse(r.text, { categoryHint: r.categoryHint });
    expect(p.findings.fiber.value).toBe("95% cotton, 5% elastane");
  });

  it("does NOT dump the whole JSON blob — only material-key values (anti-neighbour)", () => {
    const next = JSON.stringify({
      props: {
        otherProduct: { title: "99% polyester jacket" }, // not a material key
        product: { material: "100% cotton" },
      },
    });
    const html = `<html><body><h1>Tee</h1><script id="__NEXT_DATA__" type="application/json">${next}</script></body></html>`;
    const r = extractText(html, "https://shop.com/p/tee");
    expect(r.text).toMatch(/100% cotton/i);
    expect(r.text).not.toMatch(/99% polyester/i);
  });

  it("gives visible-text provenance to body prose on a thin page (1a polish)", () => {
    // Composition in a bare <p> (NOT a PRODUCT_SELECTORS container). Pre-polish
    // it reached the verdict only via the blob → source undefined (Norse in
    // prod). Now the visible-text candidate (incl. body when thin) carries it.
    const html = `<html><head><title>Tee</title></head><body><h1>Heavy Tee</h1><p>This heavyweight tee is 100% cotton.</p></body></html>`;
    const r = extractText(html, "https://shop.com/products/tee");
    const vis = (r.candidates?.fiber ?? []).find((c) => c.source === "visible-text");
    expect(vis).toBeTruthy();
    expect(vis?.raw).toMatch(/100% cotton/i);
    // End-to-end: parse with the candidates → fiber gets visible-text provenance.
    const p = parse(r.text, { categoryHint: r.categoryHint, candidates: r.candidates });
    expect(p.findings.fiber.value).toBe("100% cotton");
    expect(p.findings.fiber.source).toBe("visible-text");
  });

  it("reads composition from a spec-row shape {name:'Material', value:...} (P2.3)", () => {
    // Common 'no material' cause: the material word is the sibling LABEL, not the
    // key, so the key-only walk misses it. Stays within parsed JSON islands — the
    // risky inline window.__NUXT__ blob remains deferred (#P2-B).
    const next = JSON.stringify({
      props: {
        product: {
          specs: [
            { name: "Fit", value: "Regular" },
            { name: "Material", value: "100% linen" },
          ],
        },
      },
    });
    const html = `<html><body><h1>Shirt</h1><script id="__NEXT_DATA__" type="application/json">${next}</script></body></html>`;
    const r = extractText(html, "https://shop.com/p/shirt");
    expect(r.text).toMatch(/100% linen/i);
    // The non-material spec-row value must not be pulled in as a finding source.
    expect(r.text).not.toMatch(/\bRegular\b/);
  });
});

describe("extractText — image dedup + gates (G1)", () => {
  it("collapses size-variants of the same photo to one (keeps the largest)", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.shop/files/p.jpg?v=1&width=2048">
      <meta property="og:image" content="https://cdn.shop/files/p.jpg?crop=center&width=1200">
      </head><body><h1>Tee</h1><p>100% cotton</p></body></html>`;
    const r = extractText(html, "https://shop.com/products/tee");
    expect(r.images).toHaveLength(1); // same file, not two
    expect(r.images?.[0]).toContain("width=2048"); // kept the larger variant
  });

  it("drops thumbnails by max srcset width (Gate C), keeps the full image", () => {
    const html = `<html><body><main>
      <div class="product-gallery">
        <img src="https://cdn.x/main.jpg" srcset="https://cdn.x/main-1200.jpg 1200w">
        <img src="https://cdn.x/thumb.jpg?width=80">
      </div><p>100% cotton</p></main></body></html>`;
    const r = extractText(html, "https://shop.com/products/tee");
    expect(r.images?.some((u) => u.includes("main"))).toBe(true);
    expect(r.images?.some((u) => u.includes("thumb"))).toBe(false);
  });

  it("Gate B (opportunistic): when the SKU is in the URL, keeps only matching gallery images", () => {
    const html = `<html><body><main>
      <div class="product-gallery">
        <img src="https://cdn.x/12345-front.jpg?width=1000">
        <img src="https://cdn.x/banner-promo.jpg?width=1000">
      </div><p>100% cotton</p></main></body></html>`;
    const r = extractText(html, "https://shop.com/p/cool-shirt-12345");
    expect(r.images?.some((u) => u.includes("12345-front"))).toBe(true);
    expect(r.images?.some((u) => u.includes("banner-promo"))).toBe(false);
  });

  it("Gate B never zeroes a gallery: asset-id filenames with no URL match are kept (Shopify regression guard)", () => {
    // Norse case: handle has no digits, image is an asset id -> no token match ->
    // Gate B must be ignored, NOT filter everything out.
    const html = `<html><body><main>
      <div class="product-gallery"><img src="https://cdn.shop/files/N01-0679-0001-10.jpg?width=1000"></div>
      <p>100% cotton</p></main></body></html>`;
    const r = extractText(
      html,
      "https://norseprojects.com/products/norse-standard-heavy-loose-t-shirt-white",
    );
    expect(r.images).toHaveLength(1);
    expect(r.images?.[0]).toContain("N01-0679-0001-10.jpg");
  });
});

describe("hasFabricSignal", () => {
  it("detects composition / GSM / fiber signals", () => {
    expect(hasFabricSignal("Composition: 100% cotton")).toBe(true);
    expect(hasFabricSignal("235 GSM heavyweight")).toBe(true);
    expect(hasFabricSignal("Made in Portugal. Boxy fit.")).toBe(false);
  });
});

describe("hasFiberSignal / hasGsmSignal (L-A)", () => {
  it("fiber signal: % or named fibre, not weight", () => {
    expect(hasFiberSignal("100% cotton")).toBe(true);
    expect(hasFiberSignal("organic linen")).toBe(true);
    expect(hasFiberSignal("220 GSM")).toBe(false);
    expect(hasFiberSignal("Boxy fit")).toBe(false);
  });
  it("gsm signal: requires a number near the unit (not bare prose)", () => {
    expect(hasGsmSignal("220 GSM")).toBe(true);
    expect(hasGsmSignal("180 g/m²")).toBe(true);
    expect(hasGsmSignal("7 oz")).toBe(true);
    expect(hasGsmSignal("GSM rating")).toBe(false); // bare unit, no number
    expect(hasGsmSignal("100% cotton")).toBe(false);
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
      expect(r.via).toBe("reader");
      expect(r.extract.text.toLowerCase()).toContain("100% cotton");
      const parsed = parse(r.extract.text, { categoryHint: r.extract.categoryHint });
      expect(parsed.category).toBe("shirt");
      expect(parsed.findings.fiber.value).toBe("100% cotton");
    }
  });

  // Regression repro (the "no image" bucket): a JS-heavy-but-not-blocked page
  // (Superdry/Osklen/Zalando) serves og:image in the direct HTML but loads the
  // composition via JS, so fetchPage falls to the reader. The reader returns
  // text only — the direct og:image MUST be carried over (A2 merge), or the
  // result ships with zero images. Pre-A2 (deployed HEAD) returned `reader`
  // raw, dropping the image -> empty gallery in production.
  it("carries the direct og:image into the reader-path result (A2 merge)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const u = String(input);
        if (u.startsWith("https://r.jina.ai/")) {
          // Reader renders the JS and returns the composition (text only).
          return new Response(
            "Essential Serif Logo T-Shirt. Composition: 100% cotton. 180 GSM.",
            { status: 200, headers: { "content-type": "text/plain" } },
          );
        }
        // Direct fetch succeeds (200 HTML) and exposes og:image, but the page
        // text has NO fabric signal (composition is JS-loaded) -> not fast-path.
        return new Response(
          `<html><head><meta property="og:image" content="https://images.superdry.de/photo.jpg"></head><body><h1>Essential Serif Logo Tee</h1><p>Crew neck. Short sleeve. Style 279271. Loose fit.</p></body></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }),
    );

    const r = await fetchPage(
      "https://www.superdry.de/herren/t-shirts/essential-serif-logo-t-shirt-279271.html",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.via).toBe("reader");
      // Composition came from the reader...
      expect(r.extract.text.toLowerCase()).toContain("100% cotton");
      // ...and the photo survived from the direct fetch (the bug, fixed).
      expect(r.extract.images).toEqual(["https://images.superdry.de/photo.jpg"]);
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

describe("fetchPage read-confidence (via) + retry (P2.1)", () => {
  afterEach(() => vi.unstubAllGlobals());

  // Rich enough (>200 chars of product text) to be a genuine DIRECT read, not
  // a thin page that falls to the reader.
  const PRODUCT_HTML =
    `<html><head><title>Heavy Tee</title></head><body><h1>Heavy Tee</h1>` +
    `<div class="product-description"><p>Composition: 100% cotton. 220 GSM. Boxy fit. Made in Portugal. ` +
    `This heavyweight tee is built from long-staple combed cotton for a dense, durable hand-feel that ` +
    `holds its shape wash after wash. Pre-shrunk, with twin-needle hems and a ribbed crew neck.</p></div></body></html>`;

  it("marks a healthy direct read as via:direct", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(PRODUCT_HTML, { status: 200, headers: { "content-type": "text/html" } }),
      ),
    );
    const r = await fetchPage("https://shop.example.com/heavy-tee");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.via).toBe("direct");
  });

  it("retries the direct fetch once on a transient 5xx, then succeeds", async () => {
    let directCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const u = String(input);
        if (u.startsWith("https://r.jina.ai/")) return new Response("x", { status: 500 });
        directCalls++;
        if (directCalls === 1) return new Response("oops", { status: 503 }); // transient
        return new Response(PRODUCT_HTML, { status: 200, headers: { "content-type": "text/html" } });
      }),
    );
    const r = await fetchPage("https://shop.example.com/heavy-tee");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.via).toBe("direct");
    expect(directCalls).toBe(2); // retried once
  });

  it("does NOT retry the direct fetch on a definitive 403 (goes straight to reader)", async () => {
    let directCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const u = String(input);
        if (u.startsWith("https://r.jina.ai/")) return new Response("x", { status: 500 }); // reader also fails
        directCalls++;
        return new Response("blocked", { status: 403 }); // definitive
      }),
    );
    const r = await fetchPage("https://shop.example.com/heavy-tee");
    expect(r.ok).toBe(false);
    expect(directCalls).toBe(1); // no retry on a hard block
  });

  // L-A: a THIN page whose facts (fiber+gsm) are in <meta>/JSON-LD should be
  // kept as the direct read — NOT pushed to the ~18s reader for data it has.
  // <p> is not a product container, so it lands only in the body fallback,
  // keeping productLen < 200 (thin) while text length stays > 40 (not js-heavy).
  const THIN_COMPLETE_HTML =
    `<html><head><title>Tee</title><meta name="description" content="100% cotton. 220 GSM."></head>` +
    `<body><h1>Tee</h1><p>Crew neck. Short sleeve. Made in Portugal. A wardrobe staple.</p></body></html>`;

  it("keeps a thin-but-complete direct read (fiber+gsm in meta), skipping the reader (L-A)", async () => {
    let readerCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        if (String(input).startsWith("https://r.jina.ai/")) {
          readerCalls++;
          return new Response("100% cotton", { status: 200, headers: { "content-type": "text/plain" } });
        }
        return new Response(THIN_COMPLETE_HTML, { status: 200, headers: { "content-type": "text/html" } });
      }),
    );
    const r = await fetchPage("https://shop.example.com/tee");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.via).toBe("direct");
    expect(readerCalls).toBe(0); // the win: reader not called
  });

  it("still falls to the reader for a thin-but-PARTIAL direct read (fiber, no gsm) — preserved", async () => {
    let readerCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        if (String(input).startsWith("https://r.jina.ai/")) {
          readerCalls++;
          // >40 chars so fetchViaReader accepts it (it rejects tiny reads).
          return new Response(
            "Boxy check tee. Composition: 100% cotton. 200 GSM. Made in Portugal.",
            { status: 200, headers: { "content-type": "text/plain" } },
          );
        }
        // thin, fiber only (no GSM) -> not "complete" -> must try the reader
        return new Response(
          `<html><head><title>Tee</title><meta name="description" content="100% cotton."></head><body><h1>Tee</h1><p>Crew neck. Short sleeve. Made in Portugal.</p></body></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }),
    );
    const r = await fetchPage("https://shop.example.com/tee");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.via).toBe("reader");
    expect(readerCalls).toBe(1); // not kept as direct
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
