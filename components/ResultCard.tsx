"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { AnalyzeOk, ScoreBand, Wrinkle } from "@/lib/types";
import { APP_NAME } from "@/lib/brand";

const BAND_TEXT: Record<ScoreBand, string> = {
  high: "text-good",
  medium: "text-warn",
  low: "text-bad",
  indeterminate: "text-indeterminate",
  "out-of-scope": "text-indeterminate",
};
const BAND_BAR: Record<ScoreBand, string> = {
  high: "bg-good",
  medium: "bg-warn",
  low: "bg-bad",
  indeterminate: "bg-indeterminate",
  "out-of-scope": "bg-indeterminate",
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
      <path d="M2.5 16.5v2.2h16.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 9l1.6-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Row({ label, value }: Item) {
  return (
    <div className="flex items-baseline gap-3 font-mono">
      <span className="text-[0.66rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="min-w-3 flex-1 translate-y-[-0.2em] border-b border-dotted border-line" />
      <span className="text-right text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

export function ResultCard({ data }: { data: AnalyzeOk }) {
  const { dict } = useI18n();
  const found = foundItems(data, dict);
  const missing = missingLabels(data, dict);
  const band = data.score.band;
  const isOutOfScope = band === "out-of-scope";
  const hideScore = band === "indeterminate" || isOutOfScope;

  return (
    <article className="atl-tag atl-hairline relative overflow-hidden rounded-3xl border border-line bg-paper-raised shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
      {/* product image (Fase B), proxied same-origin so the CSP stays closed */}
      {data.image && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/image?src=${encodeURIComponent(data.image)}`}
            alt={dict.category[data.category]}
            loading="lazy"
            className="max-h-72 w-full bg-paper object-contain"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-paper-raised via-transparent to-transparent"
          />
        </div>
      )}

      <div className="p-7 sm:p-10">
        {/* header */}
        <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
          <span>
            {APP_NAME} · {dict.result.reportLabel}
          </span>
          <span>{dict.category[data.category]}</span>
        </div>

        {/* verdict */}
        <div className="flex flex-col gap-5 pt-7 sm:flex-row sm:items-end sm:justify-between">
          <p
            className={`font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-6xl ${BAND_TEXT[band]}`}
          >
            {dict.result.band[band]}
          </p>
          {!hideScore && (
            <div className="shrink-0 font-mono sm:text-right">
              <p className={`text-4xl font-bold ${BAND_TEXT[band]}`}>
                {data.score.value}
                <span className="text-xl text-muted">/100</span>
              </p>
              <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full origin-left rounded-full ${BAND_BAR[band]}`}
                  style={{
                    width: `${data.score.value}%`,
                    animation: "atl-sweep 0.9s cubic-bezier(0.16,1,0.3,1) both",
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {isOutOfScope && (
          <p className="mt-3 max-w-lg text-sm text-muted">{dict.result.outOfScope}</p>
        )}
        {data.categoryConfidence === "low" && (
          <p className="mt-3 text-sm text-muted">{dict.result.categoryLow}</p>
        )}

        {/* will it wrinkle */}
        <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
          <IronIcon className={`h-7 w-7 shrink-0 ${WRINKLE_TEXT[data.wrinkle]}`} />
          <div>
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
              {dict.result.wrinkleQuestion}
            </p>
            <p
              className={`font-display text-2xl font-medium leading-tight ${WRINKLE_TEXT[data.wrinkle]}`}
            >
              {dict.result.wrinkle[data.wrinkle]}
            </p>
          </div>
        </div>

        {/* composition & spec — read from the page */}
        {found.length > 0 && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
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
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-3 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
              {dict.result.missing}
            </p>
            <ul className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-wider">
              {missing.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-dashed border-line px-3 py-1 text-muted"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* audited brand seal */}
        {data.brandMatch?.ref && (
          <div className="mt-8 flex items-start gap-3 border-t border-line pt-6">
            <span className="mt-0.5 rounded-full bg-accent px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-accent-ink">
              {dict.result.auditedTag}
            </span>
            <p className="text-sm leading-relaxed text-ink">
              <span className="font-display font-semibold">{data.brandMatch.name}</span>{" "}
              <span className="text-muted">· {dict.result.brandMatch}</span>
            </p>
          </div>
        )}

        {/* confidence — suppressed when out-of-scope (decision #7) */}
        {!isOutOfScope && (
          <div className="mt-7 flex items-center justify-between border-t border-line pt-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-muted">
            <span>{dict.result.confidenceLabel}</span>
            <span className="font-bold text-ink">
              {dict.result.confidence[data.confidence]}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
