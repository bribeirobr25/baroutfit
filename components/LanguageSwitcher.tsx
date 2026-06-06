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
      className="flex items-center gap-1 text-xs"
    >
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className={`px-2 py-1 rounded-full tracking-wide transition-colors ${
              active
                ? "bg-ink text-paper"
                : "text-muted hover:text-ink"
            }`}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
