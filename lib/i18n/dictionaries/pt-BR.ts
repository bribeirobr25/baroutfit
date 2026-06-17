import type { Dict } from "./en";

// Português (Brasil). Adaptação da voz Don Draper do EN — não tradução literal:
// confiante, com um toque de malícia e calor brasileiro, vendendo o desejo de
// saber a verdade ("leia o tecido, não a etiqueta").
export const ptBR: Dict = {
  app: {
    headlineLead: "Você é o que você veste.",
    headlineMain: "Quase ninguém sabe ler isso.",
    tagline: "Esqueça a história da marca. A gente pesa o tecido e diz o que ele realmente é.",
    footerTagline: "saiba o que você veste",
  },
  home: {
    heroKicker: "Tecido, lido com honestidade",
    scrollCue: "o princípio",
    principleKicker: "O princípio",
    principleTitle:
      "Pesamos o tecido, não a história que ele conta sobre si mesmo.",
    p1Title: "Fibra acima do hype",
    p1Body:
      "Comprimento de fibra, tecelagem, gramatura, construção. O que decide como a peça veste, antes de qualquer discurso de marca.",
    p2Title: "Lido, nunca inventado",
    p2Body:
      "Lemos o que a página realmente diz. Se um dado não está lá, não inventamos.",
    p3Title: "Honestos sobre lacunas",
    p3Body:
      "Quando a etiqueta se cala, ou a fibra está fora do que avaliamos, dizemos isso em vez de fingir um veredito.",
  },
  input: {
    placeholder: "Cole o link de uma peça e a gente lê pra você",
    button: "Ler",
    analyzing: "Lendo…",
    errorInvalid: "Esse link a gente não consegue seguir. Confira e tente de novo.",
    tryExamples: "Sem link à mão? Comece por uma destas:",
  },
  analyzing: {
    steps: [
      "Lendo o fio…",
      "Pesando a verdade…",
      "Separando o pano da conversa…",
    ],
    aria: "Lendo o tecido",
    reading: "Lendo",
  },
  result: {
    reportLabel: "relatório do tecido",
    auditedTag: "Auditada",
    noReading: "Sem leitura",
    detectedCategory: "O que é",
    categoryLow: "Estamos lendo nas entrelinhas do corte. Leve isso em conta.",
    quality: "Qualidade",
    wrinkleQuestion: "Amassa?",
    found: "O que o tecido entrega",
    missing: "O que ele não diz. Confira na etiqueta.",
    confidenceLabel: "Nossa certeza",
    brandMatch: "Uma casa que a gente conhece. Esta a gente conferiu na fonte.",
    again: "Ler outra",
    noPhoto: "A foto não veio.",
    openStore: "Abrir na loja",
    galleryPrev: "Imagem anterior",
    galleryNext: "Próxima imagem",
    galleryImage: "Imagem",
    galleryClose: "Fechar",
    verifiedTag: "direto da página",
    inferredTag: "confirmar na etiqueta",
    alsoConsider: "O que nós escolheríamos",
    alsoConsiderNote: "Peças auditadas que confiamos nesta categoria.",
    share: "Compartilhar este veredito",
    shareCopied: "Link copiado",
    outOfScope:
      "Por enquanto só avaliamos algodão, merino e TENCEL. Esta peça é de outra fibra, então não vamos inventar um veredito.",
    band: {
      high: "Coisa de verdade",
      medium: "Honestamente bom",
      low: "Mais etiqueta que tecido",
      indeterminate: "A etiqueta se cala",
      "out-of-scope": "Ainda não é o nosso tecido",
    },
    wrinkle: {
      low: "Mantém a pose",
      medium: "Amassa um pouco",
      high: "Amassa à vontade",
      unknown: "Não diz",
    },
    confidence: {
      verified: "Temos certeza",
      partial: "Metade da história",
      unreadable: "A porta ficou fechada",
    },
    ourRating: "Nossa avaliação",
    verifiedAtSource: "Verificado na fonte",
    referencePartial: "Referência parcial. Confirme os dados na etiqueta.",
    madeIn: "Feito em",
    tier: { top: "Topo de linha", high: "Excelente", mid: "Sólida" },
  },
  category: {
    tshirt: "Camiseta",
    shirt: "Camisa",
    pullover: "Moletom",
    hoodie: "Moletom com capuz",
    unknown: "Difícil dizer",
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
    nonIron: "Tratado pra não amassar",
  },
  error: {
    unreadable:
      "Algumas lojas guardam seus segredos a sete chaves. Esta não deixa a gente ler a etiqueta. Tente outro link, ou faça do jeito antigo e leia a etiqueta você mesmo.",
  },
  ads: {
    placeholder: "Este espaço está à venda",
  },
  language: {
    label: "Idioma",
  },
};
