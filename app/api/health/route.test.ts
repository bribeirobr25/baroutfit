import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health (OPS-2)", () => {
  it("returns ok + a non-empty version string", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(typeof json.version).toBe("string");
    expect(json.version.length).toBeGreaterThan(0); // "dev" locally, git SHA on Vercel
  });
});
