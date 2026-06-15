import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";

function req(src?: string): Request {
  const u = src
    ? `http://localhost/api/image?src=${encodeURIComponent(src)}`
    : "http://localhost/api/image";
  return new Request(u);
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/image (proxy guards)", () => {
  it("400 when src is missing", async () => {
    expect((await GET(req())).status).toBe(400);
  });

  it("400 on an SSRF reserved IP (cloud metadata)", async () => {
    // Literal reserved IP is rejected by assertSafeUrl before any fetch.
    expect((await GET(req("http://169.254.169.254/x.png"))).status).toBe(400);
  });

  it("415 when the upstream is not an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    expect((await GET(req("https://example.com/page"))).status).toBe(415);
  });

  it("200 and passes through a real image", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(png, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      ),
    );
    const res = await GET(req("https://example.com/p.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});
