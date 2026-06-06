"use client";

import { useI18n } from "@/lib/i18n/provider";

// Placeholder ad slot (CLAUDE §2.6). Must be visually distinct from analysis
// results and clearly marked as advertising — never confused with the verdict.
export function AdCard() {
  const { dict } = useI18n();
  return (
    <div
      aria-label={dict.ads.placeholder}
      className="flex items-center justify-center rounded-lg border border-dashed border-line bg-paper/60 px-4 py-10 text-xs uppercase tracking-[0.2em] text-muted select-none"
    >
      {dict.ads.placeholder}
    </div>
  );
}
