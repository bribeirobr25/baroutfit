"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { AdCard } from "./AdCard";

// Analyzing state: a chartreuse scan line sweeps the cloth while evocative lines
// cross-fade. Plus the placeholder ad slots.
export function AnalyzingState() {
  const { dict } = useI18n();
  const steps = dict.analyzing.steps;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % steps.length), 1900);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <section aria-live="polite" aria-label={dict.analyzing.aria} className="w-full">
      <div className="relative my-2 flex flex-col items-center gap-6 overflow-hidden rounded-2xl border border-line bg-paper-raised py-16">
        {/* the scanning beam */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-accent/15 to-transparent"
          style={{ animation: "roupas-scan 2.1s ease-in-out infinite" }}
        />
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-accent">
          Reading
        </p>
        <p
          key={i}
          className="px-6 text-center font-display text-2xl italic text-ink sm:text-3xl"
          style={{ animation: "roupas-fade 1.9s ease-in-out" }}
        >
          {steps[i]}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AdCard />
        <AdCard />
      </div>
    </section>
  );
}
