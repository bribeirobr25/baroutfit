"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/config";

const LABELS: Record<Locale, string> = {
  en: "EN",
  "pt-BR": "PT",
  de: "DE",
  es: "ES",
};

export function LanguageSwitcher() {
  const { locale, setLocale, locales, dict } = useI18n();

  return (
    <div
      role="group"
      aria-label={dict.language.label}
      className="flex items-center gap-0.5 rounded-full border border-line bg-paper-raised/50 px-1 py-0.5 font-mono text-[0.7rem] backdrop-blur-md"
    >
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 tracking-wide transition-colors ${
              active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
            }`}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
