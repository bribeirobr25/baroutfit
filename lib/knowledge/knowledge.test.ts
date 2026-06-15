import { describe, it, expect } from "vitest";
import { classifyGsm, FIBER_QUALITY } from "./guide";
import { matchBrandByHost } from "./brands";

describe("classifyGsm", () => {
  it("classifies tshirt GSM into the guide bands", () => {
    expect(classifyGsm("tshirt", 140)?.quality).toBe(1); // basic
    expect(classifyGsm("tshirt", 170)?.quality).toBe(2); // good
    expect(classifyGsm("tshirt", 200)?.quality).toBe(3); // premium
    expect(classifyGsm("tshirt", 260)?.quality).toBe(4); // heavyweight premium
  });

  it("treats a heavy overshirt as legitimate, not low quality", () => {
    expect(classifyGsm("shirt", 308)?.quality).toBe(3); // overshirt, not penalized
    expect(classifyGsm("shirt", 150)?.quality).toBe(4); // excellent dress
  });

  it("covers pullover and hoodie bands", () => {
    expect(classifyGsm("pullover", 200)?.quality).toBe(1);
    expect(classifyGsm("pullover", 500)?.quality).toBe(4);
    expect(classifyGsm("hoodie", 250)?.quality).toBe(1);
    expect(classifyGsm("hoodie", 450)?.quality).toBe(3);
  });
});

describe("FIBER_QUALITY", () => {
  it("ranks premium fibers above organic, which is base like generic (A2)", () => {
    // A2: organic is a sustainability label, not a fiber-quality grade, so it
    // sits at the base tier alongside generic — not above it.
    expect(FIBER_QUALITY.Supima).toBeGreaterThan(FIBER_QUALITY.organic);
    expect(FIBER_QUALITY.organic).toBe(FIBER_QUALITY.generic);
    expect(FIBER_QUALITY["long-staple"]).toBeGreaterThan(FIBER_QUALITY.organic);
    expect(FIBER_QUALITY.TENCEL).toBe(4);
  });

  it("egyptian is premium tier (lote 3)", () => {
    expect(FIBER_QUALITY.egyptian).toBe(4);
  });

  it("modal is premium tier (lote 5)", () => {
    expect(FIBER_QUALITY.modal).toBe(4);
  });
});

describe("matchBrandByHost", () => {
  it("matches audited brands by host, including subdomains", () => {
    expect(matchBrandByHost("www.asket.com")?.name).toBe("Asket");
    expect(matchBrandByHost("shop.norseprojects.com")?.name).toBe("Norse Projects");
    expect(matchBrandByHost("hollisterco.com")?.name).toBe("Hollister");
  });

  it("matches the 2026-06-07 batch brands", () => {
    expect(matchBrandByHost("buckmason.com")?.name).toBe("Buck Mason");
    expect(matchBrandByHost("maisoncornichon.com")?.name).toBe("Maison Cornichon");
    expect(matchBrandByHost("isto.pt")?.name).toBe("ISTO.");
  });

  it("matches lote 2 brands", () => {
    expect(matchBrandByHost("asphalte.com")?.name).toBe("Asphalte");
    expect(matchBrandByHost("american-giant.com")?.name).toBe("American Giant");
  });

  it("matches lote 3 brand", () => {
    expect(matchBrandByHost("finamore.it")?.name).toBe("Finamore");
  });

  it("matches lote 5 brand", () => {
    expect(matchBrandByHost("insiderstore.com.br")?.name).toBe("Insider");
  });

  it("matches approved partials", () => {
    expect(matchBrandByHost("hastparis.com")?.name).toBe("Hast");
    expect(matchBrandByHost("kiton.com")?.name).toBe("Kiton");
    expect(matchBrandByHost("luigiborrelli.com")?.name).toBe("Luigi Borrelli");
    expect(matchBrandByHost("pompeiibrand.com")?.name).toBe("Pompeii");
    expect(matchBrandByHost("dudalina.com.br")?.name).toBe("Dudalina");
  });

  it("returns null for unknown hosts", () => {
    expect(matchBrandByHost("www.zara.com")).toBeNull();
    expect(matchBrandByHost("example.com")).toBeNull();
  });
});
