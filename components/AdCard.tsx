"use client";

import { useI18n } from "@/lib/i18n/provider";

// Placeholder ad slot (CLAUDE §2.6). Visually distinct from the result and
// clearly marked as advertising — never confused with the verdict.
export function AdCard() {
  const { dict } = useI18n();
  return (
    <div
      aria-label={dict.ads.placeholder}
      className="flex items-center justify-center rounded-2xl border border-dashed border-line px-4 py-12 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted select-none"
    >
      {dict.ads.placeholder}
    </div>
  );
}
