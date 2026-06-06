import type { Dict } from "./en";

// Español. Copy base de I18N.md §3.
export const es: Dict = {
  app: {
    headlineLead: "¿este tejido es",
    headlineMain: "realmente bueno?",
    tagline:
      "Pega el enlace de una prenda. Leemos el tejido y te decimos si es realmente bueno — y si se arruga.",
  },
  input: {
    placeholder: "Pega la URL del producto (camiseta, camisa, sudadera o sudadera con capucha)",
    button: "Analizar",
    analyzing: "Analizando…",
    errorInvalid: "Eso no parece un enlace válido. Revísalo e inténtalo de nuevo.",
  },
  analyzing: {
    steps: ["Leyendo la etiqueta…", "Comparando con la guía…", "Evaluando el tejido…"],
    aria: "Analizando la página del producto",
  },
  result: {
    detectedCategory: "Categoría detectada",
    categoryLow: "No estamos del todo seguros de la categoría — tenlo en cuenta.",
    quality: "Calidad",
    wrinkleQuestion: "¿Se arruga?",
    found: "Lo que encontramos",
    missing: "No pudimos confirmar (revisa la etiqueta)",
    confidenceLabel: "Confianza",
    brandMatch: "Marca auditada — tenemos datos de referencia verificados.",
    again: "Analizar otra prenda",
    verifiedTag: "leído de la página",
    inferredTag: "a revisar en la etiqueta",
    band: {
      high: "Alta calidad",
      medium: "Calidad aceptable",
      low: "Baja calidad",
      indeterminate: "Datos insuficientes para concluir",
    },
    wrinkle: {
      low: "Apenas se arruga",
      medium: "Se arruga un poco",
      high: "Se arruga mucho",
      unknown: "No se puede saber",
    },
    confidence: {
      verified: "Verificado",
      partial: "Parcial",
      unreadable: "No se pudo leer la página",
    },
  },
  category: {
    tshirt: "Camiseta",
    shirt: "Camisa",
    pullover: "Sudadera",
    hoodie: "Sudadera con capucha",
    unknown: "Prenda no identificada",
  },
  finding: {
    fiber: "Composición",
    fiberType: "Fibra",
    gsm: "Gramaje (GSM)",
    weave: "Tejido",
    spinning: "Hilado",
    elastane: "Elastano",
    polyester: "Poliéster",
    nonIron: "No planchar",
    construction: "Construcción",
  },
  value: {
    yes: "Sí",
    nonIron: "Tratamiento no plancha",
  },
  error: {
    unreadable:
      "No pudimos leer esta página automáticamente. Algunas tiendas lo bloquean. Prueba otro enlace o revisa la etiqueta con nuestra guía de calidad.",
  },
  ads: {
    placeholder: "Espacio publicitario",
  },
  language: {
    label: "Idioma",
  },
};
