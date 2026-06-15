import { describe, it, expect } from "vitest";
import { parse } from "./index";
import { CORPUS } from "./__fixtures__/corpus";

// Fase A regression net (A0): freezes the full ParseResult for every corpus
// archetype. The committed snapshot is the "before" photo — A1/A2 changes show
// up as a reviewable diff that is audited by hand, never updated blindly.
describe("regression corpus (Fase A frozen baseline)", () => {
  for (const c of CORPUS) {
    it(c.name, () => {
      const r = parse(c.text, c.hint ? { categoryHint: c.hint } : {});
      expect(r).toMatchSnapshot();
    });
  }
});
