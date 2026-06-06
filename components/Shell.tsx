"use client";

import { useI18n } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/brand";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Analyzer } from "./Analyzer";

// Single-page shell (SPEC §1, CLAUDE §6): wordmark + language switcher, the
// tagline, and the analyzer. Linear, typography-led, mobile-first.
export function Shell() {
  const { dict } = useI18n();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 py-6 sm:py-10">
      <header className="flex items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          {APP_NAME}
        </span>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 flex-col justify-center py-10 sm:py-16">
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
          <span className="italic">{dict.app.headlineLead}</span>
          <br />
          {dict.app.headlineMain}
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
          {dict.app.tagline}
        </p>

        <div className="mt-8">
          <Analyzer />
        </div>
      </main>

      <footer className="pt-6 text-xs text-muted">
        <p>
          {APP_NAME} — {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
