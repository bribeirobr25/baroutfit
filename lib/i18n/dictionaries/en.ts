// English dictionary — the typed source of truth. Other locales must match this
// shape (enforced by the Dict type).
//
// Voice (EN): Don Draper. We don't sell a feature, we sell the desire to know
// what you're really wearing — and we tell the truth, because the truth is the
// better pitch. Aspirational, confident, honest. The other locales keep the
// plain, clear voice; only English carries this tone.

export const en = {
  app: {
    headlineLead: "You are what you wear.",
    headlineMain: "Most people never read it.",
    tagline:
      "Skip the brand story. We weigh the fabric and tell you what it really is.",
    footerTagline: "know what you're wearing",
  },
  home: {
    heroKicker: "Fabric, read honestly",
    scrollCue: "the principle",
    principleKicker: "The principle",
    principleTitle:
      "We weigh the cloth, not the story it tells about itself.",
    p1Title: "Fiber over hype",
    p1Body:
      "Staple length, weave, weight, construction. The things that decide how a garment wears, ahead of any brand story.",
    p2Title: "Read, never invented",
    p2Body:
      "We parse what the page actually states. If a number isn't there, we don't conjure it.",
    p3Title: "Honest about gaps",
    p3Body:
      "When the label stays quiet, or the fibre is outside what we grade, we say so instead of faking a verdict.",
  },
  input: {
    placeholder: "Drop a product link and we'll read it",
    button: "Read it",
    analyzing: "Reading…",
    errorInvalid: "That's not a link we can follow. Check it and try again.",
    tryExamples: "No link handy? Try one of these:",
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
    noPhoto: "No photo came through.",
    openStore: "Open on the store",
    galleryPrev: "Previous image",
    galleryNext: "Next image",
    galleryImage: "Image",
    galleryClose: "Close",
    verifiedTag: "straight from the page",
    inferredTag: "to confirm on the tag",
    alsoConsider: "What we'd reach for",
    alsoConsiderNote: "Audited pieces we trust in this category.",
    share: "Share this verdict",
    shareCopied: "Link copied",
    outOfScope:
      "We only weigh cotton, merino and TENCEL for now. This one's another fibre, so we won't fake a verdict on it.",
    band: {
      high: "The real thing",
      medium: "Honestly good",
      low: "Mostly marketing",
      indeterminate: "The tag stays quiet",
      "out-of-scope": "Not our trade yet",
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
    ourRating: "Our rating",
    verifiedAtSource: "Verified at source",
    referencePartial: "Partial reference. Confirm the specs on the label.",
    madeIn: "Made in",
    tier: { top: "Top of the line", high: "Excellent", mid: "Solid" },
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
