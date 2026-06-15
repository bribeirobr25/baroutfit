import { describe, it, expect } from "vitest";
import { recommendAlternatives, tierRank } from "./recommend";

describe("recommendAlternatives (Fase B)", () => {
  it("returns trusted tshirt picks, sorted by tier desc, capped at 3", () => {
    const recs = recommendAlternatives("tshirt");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < recs.length; i++) {
      expect(tierRank(recs[i - 1].tier)).toBeGreaterThanOrEqual(tierRank(recs[i].tier));
    }
  });

  it("returns one product per brand (variety, not 3 of one house)", () => {
    const brands = recommendAlternatives("tshirt").map((r) => r.brand);
    expect(new Set(brands).size).toBe(brands.length);
  });

  it("excludes the matched brand", () => {
    const recs = recommendAlternatives("tshirt", { excludeBrand: "Norse Projects" });
    expect(recs.every((r) => r.brand !== "Norse Projects")).toBe(true);
  });

  it("returns [] for categories the KB does not cover", () => {
    expect(recommendAlternatives("hoodie")).toEqual([]);
    expect(recommendAlternatives("pullover")).toEqual([]);
    expect(recommendAlternatives("unknown")).toEqual([]);
  });

  it("shirt category yields only shirt recommendations", () => {
    const recs = recommendAlternatives("shirt");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.category === "shirt")).toBe(true);
  });

  it("only recommends solid tiers (A- and better)", () => {
    const recs = recommendAlternatives("tshirt", { limit: 50 });
    expect(recs.every((r) => tierRank(r.tier) >= tierRank("A-"))).toBe(true);
  });

  it("links to the brand domain over https", () => {
    const recs = recommendAlternatives("tshirt");
    expect(recs[0].url).toMatch(/^https:\/\/[^/]+$/);
  });
});
