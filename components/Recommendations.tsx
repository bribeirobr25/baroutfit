"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Recommendation } from "@/lib/types";

// Advice block — audited pieces we trust in the same category. Deliberately a
// dark panel, NOT the cream verdict "tag", so it reads as a separate suggestion
// and never blurs into the impartial verdict (DECISIONS §4). Renders nothing
// when there is nothing to suggest (e.g. hoodie/pullover — not in the KB yet).
export function Recommendations({ items }: { items: Recommendation[] }) {
  const { dict } = useI18n();
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label={dict.result.alsoConsider}
      className="atl-hairline rounded-3xl border border-line bg-paper-raised p-7 sm:p-9"
    >
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-accent">
        {dict.result.alsoConsider}
      </p>
      <p className="mt-1 text-sm text-muted">{dict.result.alsoConsiderNote}</p>

      <ul className="mt-5 space-y-4">
        {items.map((r) => (
          <li key={`${r.brand}·${r.product}`}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-baseline justify-between gap-3 text-ink transition-colors hover:text-accent"
            >
              <span className="font-display text-lg font-semibold">
                {r.brand}
                <span className="ml-2 font-sans text-sm font-normal text-muted">
                  {r.product}
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-accent">
                {r.tier}
              </span>
            </a>
            {(r.fiber || r.gsm != null) && (
              <p className="mt-1 font-mono text-[0.72rem] text-muted">
                {[r.fiber, r.gsm != null ? `${r.gsm} g/m²` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
