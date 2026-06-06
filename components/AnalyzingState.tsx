"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { AdCard } from "./AdCard";

// Analyzing state (SPEC §2, §6): rotating "Reading / Comparing / Assessing"
// text with a light CSS animation, plus the placeholder ad cards.
export function AnalyzingState() {
  const { dict } = useI18n();
  const steps = dict.analyzing.steps;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <section aria-live="polite" aria-label={dict.analyzing.aria} className="w-full">
      <div className="flex items-center justify-center gap-3 py-10">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full bg-accent"
          style={{ animation: "roupas-pulse 1.2s ease-in-out infinite" }}
        />
        <p
          key={i}
          className="font-display text-xl sm:text-2xl text-ink"
          style={{ animation: "roupas-fade 1.8s ease-in-out" }}
        >
          {steps[i]}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AdCard />
        <AdCard />
      </div>
    </section>
  );
}
