"use client";

// i18n provider (I18N §1): browser detection with manual override, persisted in
// localStorage, EN fallback, dynamic <html lang>. The dictionary is exposed
// directly (type-safe) instead of a string-key t() function.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  HTML_LANG,
  LOCALES,
  STORAGE_KEY,
  detectLocale,
  type Locale,
} from "./config";
import { DICTIONARIES, type Dict } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dict: Dict;
  locales: readonly Locale[];
}

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && (LOCALES as readonly string[]).includes(v) ? (v as Locale) : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // SSR renders with the default locale; the client resolves the real one after
  // mount to avoid a hydration mismatch (brief EN flash is acceptable in v1).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Resolve the real locale after mount: navigator/localStorage are
    // client-only, and reading them during render would cause a hydration
    // mismatch (server has no access). This is the intended pattern for
    // syncing from a browser API, so the set-state-in-effect rule is waived.
    const stored = readStoredLocale();
    const resolved =
      stored ??
      detectLocale(
        navigator.languages?.length
          ? navigator.languages
          : [navigator.language],
      );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(resolved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // storage unavailable (e.g. privacy mode) — selection still applies for
      // the session, just not persisted.
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, dict: DICTIONARIES[locale], locales: LOCALES }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
