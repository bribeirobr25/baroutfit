import type { Dict } from "./en";

// Português (Brasil). Copy base de I18N.md §3.
export const ptBR: Dict = {
  app: {
    headlineLead: "esse tecido é",
    headlineMain: "realmente bom?",
    tagline:
      "Cole o link de uma peça de roupa. A gente lê o tecido e diz se é realmente bom. E se amassa.",
  },
  input: {
    placeholder: "Cole a URL do produto (camiseta, camisa, moletom ou moletom com capuz)",
    button: "Analisar",
    analyzing: "Analisando…",
    errorInvalid: "Isso não parece um link válido. Confira e tente de novo.",
    tryExamples: "Sem um link à mão? Analise um destes:",
  },
  analyzing: {
    steps: ["Lendo a etiqueta…", "Comparando com o guia…", "Avaliando o tecido…"],
    aria: "Analisando a página do produto",
  },
  result: {
    detectedCategory: "Categoria detectada",
    categoryLow: "Não temos certeza total da categoria. Leve isso em conta.",
    quality: "Qualidade",
    wrinkleQuestion: "Amassa muito?",
    found: "O que encontramos",
    missing: "Não foi possível confirmar (confira na etiqueta)",
    confidenceLabel: "Confiança",
    brandMatch: "Marca auditada. Temos dados de referência verificados.",
    again: "Analisar outra peça",
    verifiedTag: "lido da página",
    inferredTag: "a conferir na etiqueta",
    band: {
      high: "Alta qualidade",
      medium: "Qualidade razoável",
      low: "Baixa qualidade",
      indeterminate: "Dados insuficientes para concluir",
    },
    wrinkle: {
      low: "Quase não amassa",
      medium: "Amassa um pouco",
      high: "Amassa bastante",
      unknown: "Não dá para saber",
    },
    confidence: {
      verified: "Verificado",
      partial: "Parcial",
      unreadable: "Não foi possível ler a página",
    },
  },
  category: {
    tshirt: "Camiseta",
    shirt: "Camisa",
    pullover: "Moletom",
    hoodie: "Moletom com capuz",
    unknown: "Peça não identificada",
  },
  finding: {
    fiber: "Composição",
    fiberType: "Fibra",
    gsm: "Gramatura (GSM)",
    weave: "Tecelagem",
    spinning: "Fiação",
    elastane: "Elastano",
    polyester: "Poliéster",
    nonIron: "Não passa",
    construction: "Construção",
  },
  value: {
    yes: "Sim",
    nonIron: "Tratamento não passa",
  },
  error: {
    unreadable:
      "Não conseguimos ler esta página automaticamente. Algumas lojas bloqueiam. Tente outro link, ou confira a etiqueta usando nosso guia de qualidade.",
  },
  ads: {
    placeholder: "Espaço publicitário",
  },
  language: {
    label: "Idioma",
  },
};
