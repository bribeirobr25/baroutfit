// English dictionary — the typed source of truth. Other locales must match this
// shape (enforced by the Dict type).
//
// Voice (EN): Don Draper. We don't sell a feature, we sell the desire to know
// what you're really wearing — and we tell the truth, because the truth is the
// better pitch. Aspirational, confident, honest. The other locales keep the
// plain, clear voice; only English carries this tone.

export const en = {
  app: {
    headlineLead: "Anyone can dress.",
    headlineMain: "Few know what they're wearing.",
    tagline:
      "Forget the price. Forget the brand. Read the cloth, not the label.",
    footerTagline: "read the cloth, not the label",
  },
  input: {
    placeholder: "Paste the link. A tee, a shirt, a sweat or a hoodie",
    button: "Read it",
    analyzing: "Reading…",
    errorInvalid: "That's not a link we can follow. Check it and try again.",
    tryExamples: "No link handy? Read one of these:",
  },
  analyzing: {
    steps: [
      "Reading the thread…",
      "Weighing the truth…",
      "Telling craft from costume…",
    ],
    aria: "Reading the cloth",
    reading: "Reading",
  },
  result: {
    reportLabel: "fabric report",
    auditedTag: "Audited",
    noReading: "No reading",
    detectedCategory: "What it is",
    categoryLow: "We're reading between the lines on the cut. Keep that in mind.",
    quality: "Quality",
    wrinkleQuestion: "Will it wrinkle?",
    found: "What the cloth admits",
    missing: "What it won't say. Check the tag",
    confidenceLabel: "How sure we are",
    brandMatch: "A house we know. We've read this one against the source ourselves.",
    again: "Read another",
    verifiedTag: "straight from the page",
    inferredTag: "to confirm on the tag",
    band: {
      high: "The real thing",
      medium: "Honestly good",
      low: "Mostly marketing",
      indeterminate: "The tag stays quiet",
    },
    wrinkle: {
      low: "Holds its poise",
      medium: "Creases a little",
      high: "Creases freely",
      unknown: "Won't say",
    },
    confidence: {
      verified: "We're certain",
      partial: "Half the story",
      unreadable: "The door stayed shut",
    },
  },
  category: {
    tshirt: "T-shirt",
    shirt: "Shirt",
    pullover: "Sweatshirt",
    hoodie: "Hoodie",
    unknown: "Hard to place",
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
    nonIron: "Treated to resist creasing",
  },
  error: {
    unreadable:
      "Some shops keep their secrets behind glass. This one won't let us read the tag. Try another link, or do it the old way and read the label yourself.",
  },
  ads: {
    placeholder: "This space is for sale",
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
