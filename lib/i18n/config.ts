// i18n configuration (I18N.md §1): 4 locales, browser detection, EN fallback.

export const LOCALES = ["en", "pt-BR", "de", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const STORAGE_KEY = "roupas.locale";

// Map a BCP-47 language tag to one of our locales (I18N §1).
export function mapLanguage(tag: string): Locale | null {
  const s = tag.toLowerCase();
  if (s.startsWith("pt")) return "pt-BR";
  if (s.startsWith("de")) return "de";
  if (s.startsWith("es")) return "es";
  if (s.startsWith("en")) return "en";
  return null;
}

// Pick the best locale from the browser's ordered language list, EN fallback.
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const m = mapLanguage(tag);
    if (m) return m;
  }
  return DEFAULT_LOCALE;
}

// The `lang` attribute value for <html> per locale (accessibility/SEO, I18N §1).
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  "pt-BR": "pt-BR",
  de: "de",
  es: "es",
};
