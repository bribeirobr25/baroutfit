// Shared domain + API-contract types.
// The API contract mirrors docs/SPEC.md §3. The parser (lib/parser) produces
// `findings`; the knowledge base (lib/knowledge) classifies them; the route
// handler (app/api/analyze) assembles the AnalyzeResult.

export type Category = "tshirt" | "shirt" | "pullover" | "hoodie";
export type CategoryResult = Category | "unknown";

// Fiber quality type. Display values are kept as the canonical label the user
// sees (e.g. "TENCEL"); they are data, not translated (I18N §2).
export type FiberType =
  | "Supima"
  | "Pima"
  | "TENCEL"
  | "merino"
  | "egyptian"
  | "modal"
  | "long-staple"
  | "organic"
  | "generic";

// Weave / construction of the cloth. Broader than the illustrative set in
// SPEC §3 — PARSER §4.4 lists these explicitly.
export type Weave =
  | "twill"
  | "oxford"
  | "poplin"
  | "chambray"
  | "flannel"
  | "corduroy"
  | "denim"
  | "jersey"
  | "french-terry"
  | "fleece";

// Yarn spinning quality (PARSER §4.5). loopwheeled is a heritage signal.
export type Spinning =
  | "compact"
  | "combed-ring-spun"
  | "ring-spun"
  | "combed"
  | "open-end"
  | "loopwheeled";

export type ScoreBand = "high" | "medium" | "low" | "indeterminate";
export type Wrinkle = "low" | "medium" | "high" | "unknown";
export type Confidence = "verified" | "partial" | "unreadable";

// A single extracted datum. `verified: true` means it was read explicitly from
// the page; `verified: false` means inferred/absent (PARSER §2, SPEC §3).
export interface Finding<T> {
  value: T;
  verified: boolean;
  // Optional provenance note for debug/UI hints (never invents data).
  note?: string;
}

// One declared component of the composition, e.g. { fiber: "cotton", pct: 95 }.
export interface CompositionPart {
  fiber: string; // canonical fiber key, lowercase ("cotton", "elastane", ...)
  raw: string; // original token as displayed
  pct: number | null; // percentage if stated
}

export interface Findings {
  // Raw composition as displayed, e.g. "95% cotton 5% elastane".
  fiber: Finding<string | null>;
  fiberType: Finding<FiberType | null>;
  gsm: Finding<number | null>;
  weave: Finding<Weave | null>;
  spinning: Finding<Spinning | null>;
  elastane: Finding<number | null>;
  polyester: Finding<number | null>;
  nonIron: Finding<boolean>;
  construction: string[]; // premium construction signals found verbatim
}

export type MissingKey = "gsm" | "spinning" | "weave" | "fiber" | "fiberType";

export interface Score {
  value: number; // 0-100
  band: ScoreBand;
}

export interface BrandMatch {
  name: string;
  // i18n key for the note shown to the user (frontend translates).
  noteKey: "result.brandMatch";
  ref: boolean;
}

// Successful analysis (SPEC §3 success response).
export interface AnalyzeOk {
  status: "ok";
  category: CategoryResult;
  categoryConfidence: "high" | "low";
  findings: Findings;
  missing: MissingKey[];
  score: Score;
  wrinkle: Wrinkle;
  brandMatch: BrandMatch | null;
  confidence: Confidence;
  rawNotes?: string; // debug only, not shown to the user
}

export type UnreadableReason =
  | "anti-bot"
  | "js-heavy"
  | "not-found"
  | "timeout"
  | "blocked"
  | "rate-limited";

// Page could not be read (SPEC §3 unreadable response).
export interface AnalyzeUnreadable {
  status: "unreadable";
  reason: UnreadableReason;
  messageKey: "error.unreadable";
}

export type AnalyzeResult = AnalyzeOk | AnalyzeUnreadable;
