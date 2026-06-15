import type { Dict } from "./en";

// Español (España). Adaptación de la voz Don Draper (EN) — no traducción literal:
// expresiva, con ritmo y elegancia, modismos propios ("aguanta el tipo") y el
// juego "más etiqueta que tela". Tuteo, como hacen las marcas de moda.
export const es: Dict = {
  app: {
    headlineLead: "Eres lo que vistes.",
    headlineMain: "Casi nadie sabe leerlo.",
    tagline: "Olvida el relato de la marca. Pesamos la tela y te decimos lo que es de verdad.",
    footerTagline: "sabe lo que vistes",
  },
  home: {
    heroKicker: "Tejido, leído con honestidad",
    scrollCue: "el principio",
    principleKicker: "El principio",
    principleTitle:
      "Pesamos la tela, no la historia que cuenta sobre sí misma.",
    p1Title: "Fibra por encima del hype",
    p1Body:
      "Longitud de fibra, tejido, gramaje, confección. Lo que decide cómo se lleva una prenda, antes que cualquier relato de marca.",
    p2Title: "Leído, nunca inventado",
    p2Body:
      "Leemos lo que la página realmente dice. Si un dato no está, no lo inventamos.",
    p3Title: "Honestos con los vacíos",
    p3Body:
      "Cuando la etiqueta calla, o la fibra está fuera de lo que evaluamos, lo decimos en vez de fingir un veredicto.",
  },
  input: {
    placeholder: "Pega el enlace de una prenda y la leemos",
    button: "Leer",
    analyzing: "Leyendo…",
    errorInvalid: "Ese enlace no podemos seguirlo. Revísalo e inténtalo de nuevo.",
    tryExamples: "¿Sin enlace a mano? Empieza por una de estas:",
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
    alsoConsider: "Lo que elegiríamos",
    alsoConsiderNote: "Prendas auditadas en las que confiamos en esta categoría.",
    share: "Compartir este veredicto",
    shareCopied: "Enlace copiado",
    outOfScope:
      "Por ahora solo evaluamos algodón, merino y TENCEL. Esta prenda es de otra fibra, así que no inventaremos un veredicto.",
    band: {
      high: "Lo auténtico",
      medium: "Honestamente bien",
      low: "Más etiqueta que tela",
      indeterminate: "La etiqueta calla",
      "out-of-scope": "Aún no es lo nuestro",
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
    ourRating: "Nuestra valoración",
    verifiedAtSource: "Verificado en la fuente",
    referencePartial: "Referencia parcial. Confirma los datos en la etiqueta.",
    madeIn: "Hecho en",
    tier: { top: "De primera", high: "Excelente", mid: "Sólida" },
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
