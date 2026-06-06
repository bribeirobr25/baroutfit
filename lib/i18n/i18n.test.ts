import { describe, it, expect } from "vitest";
import { detectLocale, mapLanguage, LOCALES } from "./config";
import { DICTIONARIES } from "./dictionaries";
import { en } from "./dictionaries/en";

describe("locale detection", () => {
  it("maps language tags to locales (I18N §1)", () => {
    expect(mapLanguage("pt-BR")).toBe("pt-BR");
    expect(mapLanguage("pt")).toBe("pt-BR");
    expect(mapLanguage("de-AT")).toBe("de");
    expect(mapLanguage("es-419")).toBe("es");
    expect(mapLanguage("en-US")).toBe("en");
    expect(mapLanguage("fr")).toBeNull();
  });

  it("falls back to EN for unsupported languages", () => {
    expect(detectLocale(["fr-FR", "it"])).toBe("en");
    expect(detectLocale(["fr", "de"])).toBe("de");
    expect(detectLocale([])).toBe("en");
  });
});

describe("dictionary completeness", () => {
  // Every locale must have the same key structure as EN — guards against a
  // missing translation key (I18N §2: same keys per locale).
  function keyPaths(obj: unknown, prefix = ""): string[] {
    if (Array.isArray(obj)) return [prefix];
    if (obj && typeof obj === "object") {
      return Object.entries(obj).flatMap(([k, v]) =>
        keyPaths(v, prefix ? `${prefix}.${k}` : k),
      );
    }
    return [prefix];
  }

  const enPaths = keyPaths(en).sort();

  for (const loc of LOCALES) {
    it(`${loc} has the same keys as en`, () => {
      expect(keyPaths(DICTIONARIES[loc]).sort()).toEqual(enPaths);
    });
  }

  it("analyzing steps have 3 entries in every locale", () => {
    for (const loc of LOCALES) {
      expect(DICTIONARIES[loc].analyzing.steps).toHaveLength(3);
    }
  });
});
