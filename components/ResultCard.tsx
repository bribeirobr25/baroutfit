"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { AnalyzeOk, ScoreBand, Wrinkle } from "@/lib/types";

// Verdict colours — read on the cream tag. Explicit strings so Tailwind keeps them.
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

function IronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 16.5h15.8c.4-3.2-.4-7.5-6-7.5-3.2 0-5.2.9-6.7 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 16.5v2.2h16.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M16 9l1.6-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// A label row with a dotted leader, like a real composition tag.
function Row({ label, value }: Item) {
  return (
    <div className="flex items-baseline gap-3 font-mono">
      <span className="text-[0.68rem] uppercase tracking-[0.12em] text-tag-muted">
        {label}
      </span>
      <span className="min-w-3 flex-1 translate-y-[-0.2em] border-b border-dotted border-tag-line" />
      <span className="text-right text-sm font-bold text-tag-ink">{value}</span>
    </div>
  );
}

export function ResultCard({ data }: { data: AnalyzeOk }) {
  const { dict } = useI18n();
  const found = foundItems(data, dict);
  const missing = missingLabels(data, dict);
  const band = data.score.band;
  const isIndeterminate = band === "indeterminate";

  return (
    <article className="roupas-tag relative rounded-[20px] bg-tag p-2.5 text-tag-ink shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)]">
      {/* eyelet — the grommet hole punched through the tag */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-paper ring-1 ring-tag-line"
      />

      <div className="rounded-[13px] border border-dashed border-tag-line px-6 pb-7 pt-8 sm:px-9">
        {/* label header */}
        <div className="flex items-center justify-between border-b border-tag-line/70 pb-4 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-tag-muted">
          <span>{APP_HEADER}</span>
          <span>{dict.category[data.category]}</span>
        </div>

        {/* the verdict */}
        <div className="flex flex-col gap-5 pt-7 sm:flex-row sm:items-end sm:justify-between">
          <p
            className={`font-display text-5xl font-black leading-[0.92] tracking-[-0.02em] sm:text-6xl ${BAND_TEXT[band]}`}
          >
            {dict.result.band[band]}
          </p>
          {!isIndeterminate && (
            <div className="shrink-0 font-mono sm:text-right">
              <p className={`text-4xl font-bold ${BAND_TEXT[band]}`}>
                {data.score.value}
                <span className="text-xl text-tag-muted">/100</span>
              </p>
              <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-tag-line/60">
                <div
                  className={`h-full origin-left rounded-full ${BAND_BAR[band]}`}
                  style={{
                    width: `${data.score.value}%`,
                    animation: "roupas-sweep 0.9s cubic-bezier(0.16,1,0.3,1) both",
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {data.categoryConfidence === "low" && (
          <p className="mt-3 text-sm text-tag-muted">{dict.result.categoryLow}</p>
        )}

        {/* will it wrinkle */}
        <div className="mt-8 flex items-center gap-4 border-t border-tag-line/70 pt-6">
          <IronIcon className={`h-7 w-7 shrink-0 ${WRINKLE_TEXT[data.wrinkle]}`} />
          <div>
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-tag-muted">
              {dict.result.wrinkleQuestion}
            </p>
            <p
              className={`font-display text-2xl italic leading-tight ${WRINKLE_TEXT[data.wrinkle]}`}
            >
              {dict.result.wrinkle[data.wrinkle]}
            </p>
          </div>
        </div>

        {/* composition & spec — read from the page */}
        {found.length > 0 && (
          <div className="mt-8 border-t border-tag-line/70 pt-6">
            <p className="mb-4 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-tag-muted">
              {dict.result.found}{" "}
              <span className="text-good">· {dict.result.verifiedTag}</span>
            </p>
            <div className="space-y-2.5">
              {found.map((it) => (
                <Row key={it.label} label={it.label} value={it.value} />
              ))}
            </div>
          </div>
        )}

        {/* not stated */}
        {missing.length > 0 && (
          <div className="mt-8 border-t border-tag-line/70 pt-6">
            <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-tag-muted">
              {dict.result.missing}
            </p>
            <ul className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-wider">
              {missing.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-dashed border-tag-line px-3 py-1 text-tag-muted"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* audited brand seal */}
        {data.brandMatch?.ref && (
          <div className="mt-8 flex items-start gap-3 border-t border-tag-line/70 pt-6">
            <span className="mt-0.5 rounded-full bg-tag-ink px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-tag">
              Audited
            </span>
            <p className="text-sm leading-relaxed text-tag-ink">
              <span className="font-display font-semibold">
                {data.brandMatch.name}
              </span>{" "}
              <span className="text-tag-muted">· {dict.result.brandMatch}</span>
            </p>
          </div>
        )}

        {/* confidence — the "made in" line */}
        <div className="mt-7 flex items-center justify-between border-t border-tag-line/70 pt-4 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-tag-muted">
          <span>{dict.result.confidenceLabel}</span>
          <span className="font-bold text-tag-ink">
            {dict.result.confidence[data.confidence]}
          </span>
        </div>
      </div>
    </article>
  );
}

const APP_HEADER = "roupas · fabric report";
