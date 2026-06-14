import type { Dict } from "./en";

// Español (España). Adaptación de la voz Don Draper (EN) — no traducción literal:
// expresiva, con ritmo y elegancia, modismos propios ("aguanta el tipo") y el
// juego "más etiqueta que tela". Tuteo, como hacen las marcas de moda.
export const es: Dict = {
  app: {
    headlineLead: "Cualquiera se viste.",
    headlineMain: "Pocos saben lo que llevan.",
    tagline: "Olvida el precio. Olvida la marca. Lee la tela, no la etiqueta.",
    footerTagline: "lee la tela, no la etiqueta",
  },
  input: {
    placeholder: "Pega el enlace. Camiseta, camisa, sudadera o hoodie.",
    button: "Leer",
    analyzing: "Leyendo…",
    errorInvalid: "Ese enlace no podemos seguirlo. Revísalo e inténtalo de nuevo.",
    tryExamples: "¿Sin un enlace a mano? Lee uno de estos:",
  },
  analyzing: {
    steps: [
      "Leyendo el hilo…",
      "Pesando la verdad…",
      "Separando el oficio del cuento…",
    ],
    aria: "Leyendo la tela",
    reading: "Leyendo",
  },
  result: {
    reportLabel: "informe de la tela",
    auditedTag: "Auditada",
    noReading: "Sin lectura",
    detectedCategory: "Qué es",
    categoryLow: "Estamos leyendo entre líneas en el corte. Tenlo en cuenta.",
    quality: "Calidad",
    wrinkleQuestion: "¿Se arruga?",
    found: "Lo que confiesa la tela",
    missing: "Lo que calla. Mira la etiqueta.",
    confidenceLabel: "Nuestra certeza",
    brandMatch: "Una casa que conocemos. A esta la hemos leído en la fuente.",
    again: "Leer otra",
    verifiedTag: "directo de la página",
    inferredTag: "confirmar en la etiqueta",
    band: {
      high: "Lo auténtico",
      medium: "Honestamente bien",
      low: "Más etiqueta que tela",
      indeterminate: "La etiqueta calla",
    },
    wrinkle: {
      low: "Aguanta el tipo",
      medium: "Se arruga un poco",
      high: "Se arruga sin reparo",
      unknown: "No lo dice",
    },
    confidence: {
      verified: "Estamos seguros",
      partial: "Media historia",
      unreadable: "La puerta siguió cerrada",
    },
  },
  category: {
    tshirt: "Camiseta",
    shirt: "Camisa",
    pullover: "Sudadera",
    hoodie: "Sudadera con capucha",
    unknown: "Difícil de ubicar",
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
    nonIron: "Tratada para no arrugarse",
  },
  error: {
    unreadable:
      "Algunas tiendas guardan sus secretos bajo llave. Esta no nos deja leer la etiqueta. Prueba otro enlace, o hazlo a la antigua y lee la etiqueta tú mismo.",
  },
  ads: {
    placeholder: "Este espacio se alquila",
  },
  language: {
    label: "Idioma",
  },
};
