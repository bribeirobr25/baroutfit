import type { Dict } from "./en";

// Deutsch. Adaption der Don-Draper-Stimme (EN) — keine 1:1-Übersetzung:
// präzise, trocken, qualitätsversessen, mit dem Wortspiel "mehr Schein als
// Stoff". Du-Form, wie es modische Marken tun.
export const de: Dict = {
  app: {
    headlineLead: "Du bist, was du trägst.",
    headlineMain: "Kaum jemand kann es lesen.",
    tagline: "Vergiss die Markenstory. Wir wiegen den Stoff und sagen dir, was er wirklich ist.",
    footerTagline: "wisse, was du trägst",
  },
  input: {
    placeholder: "Produktlink einfügen, wir lesen ihn",
    button: "Lesen",
    analyzing: "Liest…",
    errorInvalid: "Diesem Link können wir nicht folgen. Prüf ihn und versuch's nochmal.",
    tryExamples: "Kein Link zur Hand? Fang mit einem davon an:",
  },
  analyzing: {
    steps: [
      "Liest den Faden…",
      "Wiegt die Wahrheit…",
      "Trennt Können von Kulisse…",
    ],
    aria: "Liest den Stoff",
    reading: "Liest",
  },
  result: {
    reportLabel: "Stoff-Report",
    auditedTag: "Geprüft",
    noReading: "Keine Lesung",
    detectedCategory: "Was es ist",
    categoryLow: "Beim Schnitt lesen wir zwischen den Zeilen. Behalt das im Hinterkopf.",
    quality: "Qualität",
    wrinkleQuestion: "Knittert es?",
    found: "Was der Stoff zugibt",
    missing: "Was er verschweigt. Prüf das Etikett.",
    confidenceLabel: "Wie sicher wir sind",
    brandMatch: "Ein Haus, das wir kennen. Dieses haben wir an der Quelle geprüft.",
    again: "Noch eins lesen",
    verifiedTag: "direkt von der Seite",
    inferredTag: "am Etikett prüfen",
    band: {
      high: "Das Echte",
      medium: "Ehrlich gut",
      low: "Mehr Schein als Stoff",
      indeterminate: "Das Etikett schweigt",
    },
    wrinkle: {
      low: "Behält Haltung",
      medium: "Knittert ein wenig",
      high: "Knittert munter",
      unknown: "Sagt nichts",
    },
    confidence: {
      verified: "Wir sind sicher",
      partial: "Die halbe Geschichte",
      unreadable: "Die Tür blieb zu",
    },
  },
  category: {
    tshirt: "T-Shirt",
    shirt: "Hemd",
    pullover: "Sweatshirt",
    hoodie: "Hoodie",
    unknown: "Schwer einzuordnen",
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
    nonIron: "Knitterfrei ausgerüstet",
  },
  error: {
    unreadable:
      "Manche Shops hüten ihre Geheimnisse hinter Glas. Dieser lässt uns das Etikett nicht lesen. Versuch einen anderen Link, oder mach's auf die alte Art und lies das Etikett selbst.",
  },
  ads: {
    placeholder: "Diese Fläche ist zu vermieten",
  },
  language: {
    label: "Sprache",
  },
};
