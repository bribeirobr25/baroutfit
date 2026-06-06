// English dictionary — the typed source of truth. Other locales must match this
// shape (enforced by the Dict type). Copy base from I18N.md §3, extended with
// labels the UI needs (category names, finding labels, section headings).

export const en = {
  app: {
    tagline:
      "Paste a clothing product link. We read the fabric and tell you if it's actually good — and whether it wrinkles.",
  },
  input: {
    placeholder: "Paste the product URL (t-shirt, shirt, sweatshirt or hoodie)",
    button: "Analyze",
    analyzing: "Analyzing…",
    errorInvalid: "That doesn't look like a valid link. Check and try again.",
  },
  analyzing: {
    steps: ["Reading the label…", "Comparing with the guide…", "Assessing the fabric…"],
    aria: "Analyzing the product page",
  },
  result: {
    detectedCategory: "Detected category",
    categoryLow: "We're not fully sure of the category — read on with that in mind.",
    quality: "Quality",
    wrinkleQuestion: "Does it wrinkle?",
    found: "What we found",
    missing: "Couldn't confirm (check the label)",
    confidenceLabel: "Confidence",
    brandMatch: "Audited brand — we have verified reference data.",
    again: "Analyze another item",
    verifiedTag: "read from the page",
    inferredTag: "to check on the label",
    band: {
      high: "High quality",
      medium: "Decent quality",
      low: "Low quality",
      indeterminate: "Not enough data to judge",
    },
    wrinkle: {
      low: "Barely wrinkles",
      medium: "Wrinkles a bit",
      high: "Wrinkles a lot",
      unknown: "Can't tell",
    },
    confidence: {
      verified: "Verified",
      partial: "Partial",
      unreadable: "Couldn't read the page",
    },
  },
  category: {
    tshirt: "T-shirt",
    shirt: "Shirt",
    pullover: "Sweatshirt",
    hoodie: "Hoodie",
    unknown: "Unknown garment",
  },
  finding: {
    fiber: "Composition",
    fiberType: "Fiber",
    gsm: "Weight (GSM)",
    weave: "Weave",
    spinning: "Spinning",
    elastane: "Elastane",
    polyester: "Polyester",
    nonIron: "Non-iron",
    construction: "Construction",
  },
  value: {
    yes: "Yes",
    nonIron: "Non-iron treated",
  },
  error: {
    unreadable:
      "We couldn't read this page automatically. Some shops block it. Try another link, or check the label using our quality guide.",
  },
  ads: {
    placeholder: "Ad space",
  },
  language: {
    label: "Language",
  },
} as const;

// The structural type all locales conform to. Arrays are widened so that other
// locales can provide their own strings (same length expected).
export type Dict = {
  readonly [K in keyof typeof en]: DeepLoose<(typeof en)[K]>;
};

type DeepLoose<T> = T extends readonly string[]
  ? readonly string[]
  : T extends string
    ? string
    : { readonly [K in keyof T]: DeepLoose<T[K]> };
