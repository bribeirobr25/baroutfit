"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { AnalyzeOk, ScoreBand, Wrinkle } from "@/lib/types";

// Band / wrinkle color tokens — explicit class strings so Tailwind keeps them.
const BAND_TEXT: Record<ScoreBand, string> = {
  high: "text-good",
  medium: "text-warn",
  low: "text-bad",
  indeterminate: "text-indeterminate",
};
const BAND_BAR: Record<ScoreBand, string> = {
  high: "bg-good",
  medium: "bg-warn",
  low: "bg-bad",
  indeterminate: "bg-indeterminate",
};
const WRINKLE_TEXT: Record<Wrinkle, string> = {
  low: "text-good",
  medium: "text-warn",
  high: "text-bad",
  unknown: "text-indeterminate",
};

interface Item {
  label: string;
  value: string;
}

function foundItems(data: AnalyzeOk, dict: Dict): Item[] {
  const f = data.findings;
  const items: Item[] = [];
  if (f.fiberType.verified && f.fiberType.value)
    items.push({ label: dict.finding.fiberType, value: String(f.fiberType.value) });
  if (f.fiber.verified && f.fiber.value)
    items.push({ label: dict.finding.fiber, value: f.fiber.value });
  if (f.gsm.verified && f.gsm.value != null)
    items.push({ label: dict.finding.gsm, value: `${f.gsm.value} g/m²` });
  if (f.weave.verified && f.weave.value)
    items.push({ label: dict.finding.weave, value: String(f.weave.value) });
  if (f.spinning.verified && f.spinning.value)
    items.push({
      label: dict.finding.spinning,
      value: String(f.spinning.value).replace(/-/g, " "),
    });
  if (f.elastane.verified && f.elastane.value != null)
    items.push({ label: dict.finding.elastane, value: `${f.elastane.value}%` });
  if (f.polyester.verified && f.polyester.value != null)
    items.push({ label: dict.finding.polyester, value: `${f.polyester.value}%` });
  if (f.nonIron.value)
    items.push({ label: dict.finding.nonIron, value: dict.value.nonIron });
  if (f.construction.length > 0)
    items.push({
      label: dict.finding.construction,
      value: f.construction.join(", "),
    });
  return items;
}

function missingLabels(data: AnalyzeOk, dict: Dict): string[] {
  const map: Record<string, string> = {
    fiber: dict.finding.fiber,
    fiberType: dict.finding.fiberType,
    gsm: dict.finding.gsm,
    weave: dict.finding.weave,
    spinning: dict.finding.spinning,
  };
  return data.missing.map((k) => map[k]).filter(Boolean);
}

export function ResultCard({ data }: { data: AnalyzeOk }) {
  const { dict } = useI18n();
  const found = foundItems(data, dict);
  const missing = missingLabels(data, dict);
  const band = data.score.band;
  const isIndeterminate = band === "indeterminate";

  return (
    <article className="w-full rounded-2xl border border-line bg-paper-raised p-6 sm:p-8 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      {/* 1. Detected category */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          {dict.result.detectedCategory}
        </p>
        <p className="font-display text-2xl text-ink mt-1">
          {dict.category[data.category]}
        </p>
        {data.categoryConfidence === "low" && (
          <p className="text-sm text-muted mt-1">{dict.result.categoryLow}</p>
        )}
      </div>

      {/* 2. Main verdict */}
      <div className="mb-8">
        <p
          className={`font-display text-4xl sm:text-5xl font-semibold leading-tight ${BAND_TEXT[band]}`}
        >
          {dict.result.band[band]}
        </p>
        {!isIndeterminate && (
          <div className="mt-4 max-w-sm">
            <div className="h-2 w-full rounded-full bg-line overflow-hidden">
              <div
                className={`h-full rounded-full ${BAND_BAR[band]}`}
                style={{ width: `${data.score.value}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">{data.score.value}/100</p>
          </div>
        )}
      </div>

      {/* 3. Does it wrinkle? */}
      <div className="mb-8 border-t border-line pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          {dict.result.wrinkleQuestion}
        </p>
        <p className={`font-display text-2xl mt-1 ${WRINKLE_TEXT[data.wrinkle]}`}>
          {dict.result.wrinkle[data.wrinkle]}
        </p>
      </div>

      {/* 4. What we found (verified, read from the page) */}
      {found.length > 0 && (
        <div className="mb-8 border-t border-line pt-6">
          <h2 className="text-sm font-medium text-ink">{dict.result.found}</h2>
          <p className="mb-3 text-xs text-muted">{dict.result.verifiedTag}</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {found.map((it) => (
              <div key={it.label} className="flex items-baseline gap-2">
                <span aria-hidden className="text-good mt-0.5">
                  ✓
                </span>
                <dt className="text-muted text-sm">{it.label}:</dt>
                <dd className="text-ink text-sm font-medium">{it.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* 5. Couldn't confirm (to check on the label) */}
      {missing.length > 0 && (
        <div className="mb-8 border-t border-line pt-6">
          <h2 className="text-sm font-medium text-ink mb-3">
            {dict.result.missing}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {missing.map((label) => (
              <li
                key={label}
                className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Audited brand */}
      {data.brandMatch?.ref && (
        <div className="mb-8 border-t border-line pt-6">
          <p className="text-sm text-ink">
            <span className="font-medium">{data.brandMatch.name}</span>{" "}
            <span className="text-muted">— {dict.result.brandMatch}</span>
          </p>
        </div>
      )}

      {/* 7. Confidence */}
      <div className="border-t border-line pt-6">
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          {dict.result.confidenceLabel}:{" "}
        </span>
        <span className="text-sm font-medium text-ink">
          {dict.result.confidence[data.confidence]}
        </span>
      </div>
    </article>
  );
}
