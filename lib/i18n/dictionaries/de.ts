import type { Dict } from "./en";

// Deutsch. Copy-Basis aus I18N.md §3.
export const de: Dict = {
  app: {
    headlineLead: "ist dieser stoff",
    headlineMain: "wirklich gut?",
    tagline:
      "Füge den Link eines Kleidungsstücks ein. Wir lesen den Stoff und sagen dir, ob er wirklich gut ist – und ob er knittert.",
  },
  input: {
    placeholder: "Produkt-URL einfügen (T-Shirt, Hemd, Sweatshirt oder Hoodie)",
    button: "Analysieren",
    analyzing: "Analysiere…",
    errorInvalid: "Das sieht nicht nach einem gültigen Link aus. Bitte überprüfen.",
    tryExamples: "Kein Link zur Hand? Analysiere einen davon:",
  },
  analyzing: {
    steps: ["Etikett wird gelesen…", "Abgleich mit dem Leitfaden…", "Stoff wird bewertet…"],
    aria: "Die Produktseite wird analysiert",
  },
  result: {
    detectedCategory: "Erkannte Kategorie",
    categoryLow: "Wir sind uns bei der Kategorie nicht ganz sicher. Bitte beachten.",
    quality: "Qualität",
    wrinkleQuestion: "Knittert es?",
    found: "Was wir gefunden haben",
    missing: "Nicht bestätigt (Etikett prüfen)",
    confidenceLabel: "Verlässlichkeit",
    brandMatch: "Geprüfte Marke. Wir haben verifizierte Referenzdaten.",
    again: "Weiteres Teil analysieren",
    verifiedTag: "von der Seite gelesen",
    inferredTag: "am Etikett prüfen",
    band: {
      high: "Hohe Qualität",
      medium: "Solide Qualität",
      low: "Niedrige Qualität",
      indeterminate: "Nicht genug Daten für ein Urteil",
    },
    wrinkle: {
      low: "Knittert kaum",
      medium: "Knittert etwas",
      high: "Knittert stark",
      unknown: "Nicht feststellbar",
    },
    confidence: {
      verified: "Bestätigt",
      partial: "Teilweise",
      unreadable: "Seite nicht lesbar",
    },
  },
  category: {
    tshirt: "T-Shirt",
    shirt: "Hemd",
    pullover: "Sweatshirt",
    hoodie: "Hoodie",
    unknown: "Unbekanntes Teil",
  },
  finding: {
    fiber: "Zusammensetzung",
    fiberType: "Faser",
    gsm: "Gewicht (GSM)",
    weave: "Bindung",
    spinning: "Spinnverfahren",
    elastane: "Elasthan",
    polyester: "Polyester",
    nonIron: "Bügelfrei",
    construction: "Verarbeitung",
  },
  value: {
    yes: "Ja",
    nonIron: "Bügelfrei-Ausrüstung",
  },
  error: {
    unreadable:
      "Wir konnten diese Seite nicht automatisch lesen. Manche Shops blockieren das. Versuche einen anderen Link oder prüfe das Etikett mit unserem Qualitätsleitfaden.",
  },
  ads: {
    placeholder: "Werbefläche",
  },
  language: {
    label: "Sprache",
  },
};
