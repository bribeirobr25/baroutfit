import type { Locale } from "../config";
import type { Dict } from "./en";
import { en } from "./en";
import { ptBR } from "./pt-BR";
import { de } from "./de";
import { es } from "./es";

export const DICTIONARIES: Record<Locale, Dict> = {
  en,
  "pt-BR": ptBR,
  de,
  es,
};

export type { Dict };
