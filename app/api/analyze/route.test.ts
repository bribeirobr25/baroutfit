import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "./route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/analyze", () => {
  it("rejects an invalid URL with 400", async () => {
    const res = await POST(makeReq({ url: "not-a-url" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("unreadable");
  });

  it("returns ok with findings and brandMatch for an audited host", async () => {
    const html = `<html><head>
      <title>The T-Shirt — White</title>
      <meta name="description" content="100% organic cotton, long staple. 180 GSM. Compact single jersey." />
      </head><body><main><h1>The T-Shirt</h1>
      <div class="product-detail">100% organic cotton long staple, 180 GSM, twin-needle hems.</div>
      </main></body></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
      ),
    );

    const res = await POST(makeReq({ url: "https://www.asket.com/en/mens-t-shirt-white" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.category).toBe("tshirt");
    expect(json.findings.gsm.value).toBe(180);
    expect(json.confidence).toBe("verified");
    expect(json.brandMatch).toEqual({
      name: "Asket",
      noteKey: "result.brandMatch",
      ref: true,
    });
    // Fase B: trusted same-category picks, excluding the matched house (Asket).
    expect(Array.isArray(json.recommendations)).toBe(true);
    expect(json.recommendations.length).toBeGreaterThan(0);
    expect(
      json.recommendations.every(
        (r: { brand: string; category: string }) =>
          r.brand !== "Asket" && r.category === "tshirt",
      ),
    ).toBe(true);
  });

  it("returns unreadable on a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    const res = await POST(makeReq({ url: "https://shop.example.com/missing" }));
    const json = await res.json();
    expect(json.status).toBe("unreadable");
    expect(json.reason).toBe("not-found");
  });

  it("returns unreadable (anti-bot) on a 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("blocked", { status: 403 })),
    );
    const res = await POST(makeReq({ url: "https://shop.example.com/p/1" }));
    const json = await res.json();
    expect(json.status).toBe("unreadable");
    expect(json.reason).toBe("anti-bot");
  });
});
