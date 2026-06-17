// OPS-1 — post-deploy smoke check (roadmap §6/M1: "disco ≠ deployado").
// Hits the live /api/analyze for one direct-path page and one reader-path page
// and FAILS (exit 1) if either is not `ok` or returns zero images. This is the
// exact guard that would have caught the 2026-06-16 "images don't show" bug:
// the fix was green locally but the reader path dropped the image in prod.
//
// Usage:
//   node scripts/smoke.mjs                      # checks production
//   node scripts/smoke.mjs http://localhost:3000  # checks a local server
//   BASE_URL=https://preview.example node scripts/smoke.mjs
//
// Not a unit test (those are hermetic, in vitest). This deliberately makes real
// network calls against a deployed target, so it lives outside the test run.

const BASE = process.argv[2] || process.env.BASE_URL || "https://baroutfit.vercel.app";
const TIMEOUT_MS = 45_000;

// One page per read path. If a shop changes its markup these may drift — update
// them here. The point is coverage of BOTH paths, not these exact URLs.
const CASES = [
  {
    name: "direct path (Shopify og:image)",
    url: "https://norseprojects.com/products/norse-standard-heavy-loose-t-shirt-white",
  },
  {
    name: "reader path (JS-heavy, image carried from direct)",
    url: "https://www.superdry.de/herren/t-shirts/essential-serif-logo-t-shirt-mit-stickerei-279271.html",
  },
];

async function check({ name, url }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    const images = Array.isArray(data.images) ? data.images : [];
    const pass = data.status === "ok" && images.length > 0;
    console.log(
      `${pass ? "PASS" : "FAIL"}  ${name}\n      status=${data.status} images=${images.length}` +
        (images[0] ? `\n      ${images[0]}` : ""),
    );
    return pass;
  } catch (err) {
    console.log(`FAIL  ${name}\n      ${err.name === "AbortError" ? "timeout" : err.message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

console.log(`OPS-1 smoke check → ${BASE}\n`);
const results = await Promise.all(CASES.map(check));
const ok = results.every(Boolean);
console.log(`\n${ok ? "✓ all passed" : "✗ smoke check failed"}`);
process.exit(ok ? 0 : 1);
