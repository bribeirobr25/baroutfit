// OPS-2 — build identity + liveness. Lets every check (pnpm smoke, manual curl,
// Docker visual) assert it is hitting the INTENDED build, closing the
// "disco ≠ deployado" / stale-runtime class (roadmap §6 M1+M5). No user input
// (no SSRF surface), no secret, no-store so it always reflects the live instance.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(): NextResponse {
  // `||` (not `??`) so an empty-string env var also falls back — a real SHA /
  // ref / "dev" is never falsy, so there's no valid value we'd wrongly discard.
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_VERSION || "dev";
  const ref = process.env.VERCEL_GIT_COMMIT_REF || null;
  return NextResponse.json(
    { status: "ok", version, ref },
    { headers: { "cache-control": "no-store" } },
  );
}
