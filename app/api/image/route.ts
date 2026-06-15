// GET /api/image?src=<url> — same-origin image proxy (Fase B / B2).
// Serving the product image through our own origin keeps the CSP closed
// (img-src 'self') and avoids leaking a referrer to the shop. It reuses the
// same SSRF guard + per-hop redirect validation as the analyzer, caps the body
// (OOM guard), and only passes through real image content types.

import { assertSafeUrl, safeFetch } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_IMAGE_BYTES = 8_000_000; // 8 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

// Read a binary body with a hard byte cap, cancelling once it is exceeded.
// Returns null if the body is oversize or unreadable (OOM guard).
async function readBinaryCapped(
  res: Response,
  max: number,
): Promise<ArrayBuffer | null> {
  const body = res.body;
  if (!body) {
    const ab = await res.arrayBuffer();
    return ab.byteLength > max ? null : ab;
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

export async function GET(req: Request): Promise<Response> {
  const src = new URL(req.url).searchParams.get("src");
  if (!src || !(await assertSafeUrl(src))) {
    return new Response("bad src", { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const res = await safeFetch(
      src,
      { Accept: "image/*", "User-Agent": "Mozilla/5.0 BAROutfitImageProxy" },
      controller.signal,
    );
    if (!res || !res.ok) return new Response("upstream error", { status: 502 });

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_TYPES.includes(type)) {
      return new Response("not an image", { status: 415 });
    }

    // Reject early on a declared oversize length, then stream with a hard cap so
    // a missing/lying Content-Length cannot buffer an unbounded body (OOM guard),
    // mirroring the analyzer's readBodyCapped.
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > MAX_IMAGE_BYTES) return new Response("too large", { status: 413 });

    const buf = await readBinaryCapped(res, MAX_IMAGE_BYTES);
    if (buf == null) return new Response("too large", { status: 413 });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        // Cache aggressively at the edge; the source URL is the cache key.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
