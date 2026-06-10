# SPEC.md — Especificação funcional

> Leia junto com `../CLAUDE.md`, `PARSER.md`, `KNOWLEDGE-BASE.md` e `I18N.md`.

## 1. Jornada do usuário

1. A pessoa abre a página. O idioma é detectado pelo browser (EN/PT-BR/DE/ES, fallback EN). Há um seletor de idioma visível.
2. Vê um campo de URL em destaque, com copy curto explicando o que a ferramenta faz (1 frase) e **exemplos clicáveis de marcas, localizados por mercado** (EN→US/UK, PT-BR→Brasil, DE→Alemanha, ES→Espanha — `lib/examples.ts`); clicar num exemplo dispara a análise. *(Apresentação atual: redesign "Noir Couture" — ver DECISIONS §5.4.)*
3. Cola a URL de um produto (camiseta, camisa, moletom ou hoodie) e aciona "Analisar".
4. A página entra no estado **analisando**: microanimação + texto rotativo ("Analisando / Comparando / Avaliando o tecido…") + cards de anúncio (placeholder).
5. Recebe o **resultado**: veredito claro, score, "amassa muito?", achados, faltantes e nível de confiança.
6. Pode analisar outra URL (botão "Analisar outra peça") ou trocar o idioma a qualquer momento.

## 2. Estados de tela

- **input** — estado inicial. Validação de URL no cliente (formato http/https). Mensagem de erro amigável se a URL for inválida.
- **analyzing** — disparado ao enviar. Mostra animação + cards. Tem timeout (cliente ~29s, função `maxDuration` 30s); se estourar, vai para `error`. **Nota (2026-06-07):** o teto subiu de 15–20s para ~30s para acomodar o fallback de leitura via reader-proxy (lojas bloqueadas/JS-heavy). Lojas que abrem direto respondem em 1–3s; só o fallback usa o tempo extra. Ver `DECISIONS.md §2`.
- **result** — renderiza o JSON retornado pela API. Ver seção 4.
- **error / unreadable** — quando a API não conseguiu ler a página (CORS no destino, anti-bot, JS pesado, 404, timeout). Mensagem honesta: "Não foi possível ler esta página automaticamente" + sugestão (tentar outra URL, ou conferir a etiqueta manualmente com base no guia). **Nunca** mostrar um resultado falso nesse caso.

## 3. Contrato da API (`POST /api/analyze`)

**Request:** `{ "url": "https://..." }`

**Response (sucesso):**
```json
{
  "status": "ok",
  "category": "tshirt | shirt | pullover | hoodie | unknown",
  "categoryConfidence": "high | low",
  "findings": {
    "fiber": { "value": "100% organic cotton", "verified": true },
    "fiberType": { "value": "Supima | Pima | TENCEL | merino | long-staple | organic | generic | null", "verified": true },
    "gsm": { "value": 235, "verified": true },
    "weave": { "value": "twill | oxford | poplin | jersey | french-terry | fleece | null", "verified": false },
    "spinning": { "value": "combed | ring-spun | compact | null", "verified": false },
    "elastane": { "value": 5, "verified": true },
    "polyester": { "value": 0, "verified": true },
    "nonIron": { "value": true, "verified": true },
    "construction": [ "corozo buttons", "two-ply" ]
  },
  "missing": [ "gsm", "spinning" ],
  "score": { "value": 72, "band": "high | medium | low | indeterminate" },
  "wrinkle": "low | medium | high | unknown",
  "brandMatch": { "name": "Asket", "noteKey": "result.brandMatch", "ref": true },
  "confidence": "verified | partial | unreadable",
  "rawNotes": "string opcional para debug (não exibir ao usuário final)"
}
```

> **Nota de implementação (2026-06-07):** as chaves do contrato são **camelCase** no código (`messageKey`, `noteKey`), não snake_case. `brandMatch` devolve `noteKey: "result.brandMatch"` (chave de i18n), não um texto pronto — o frontend traduz. `findings.gsm` pode incluir `note: "derived from oz/yd²"` quando convertido de onças. Tipos canônicos em `lib/types.ts`.

**Response (não foi possível ler):**
```json
{ "status": "unreadable", "reason": "anti-bot | js-heavy | not-found | timeout | blocked", "messageKey": "error.unreadable" }
```

Regras:
- Todo texto exibível ao usuário vem por **chave de i18n** (`messageKey`/`noteKey`), nunca string pronta da API. A API devolve chaves + dados; o frontend traduz. (Exceção: valores extraídos como "100% organic cotton" são dados, exibidos como vêm.)
- `verified: true` = o dado foi lido da página. `verified: false` = inferido/ausente. A UI deve diferenciar visualmente.

## 4. Como renderizar o resultado

> **Apresentação atual (redesign 2026-06-10):** o resultado é exibido como uma **etiqueta de composição** (creme sobre o palco preto; ilhós, costura tracejada, dados em monospace, ícone de ferro no "amassa?", selo AUDITED). A **ordem abaixo é preservada** — muda só a forma.

Ordem sugerida, escaneável:
1. **Categoria detectada** (com ícone) + aviso discreto se `categoryConfidence: low`.
2. **Veredito principal** — band do score traduzido (Alta / Média / Baixa / Indeterminada qualidade) com cor.
3. **"Amassa muito?"** — resposta direta (Pouco / Médio / Muito / Não sei), porque é o objetivo central do dono.
4. **O que encontramos** — lista dos `findings` com `verified: true`, em linguagem simples.
5. **O que não foi possível confirmar** — lista de `missing` + findings `verified: false`. Apresentar como "a conferir na etiqueta", não como defeito.
6. **Marca auditada** (se `brandMatch.ref`) — nota de que há dados de referência verificados para a marca.
7. **Nível de confiança** — selo: Verificado / Parcial / Não foi possível ler.

Se `score.band` for `indeterminate` (ex.: 100% algodão confirmado mas sem GSM nem tecido), o veredito deve dizer claramente que **falta dado para concluir**, não dar nota baixa por omissão.

## 5. Requisitos não-funcionais

- Mobile-first; a maior parte do uso será no celular dentro da loja.
- Acessibilidade: teclado, foco visível, contraste AA, `html lang` correto, `aria-live` no estado analyzing/result.
- Performance: a animação não pode travar; o gargalo é a API, então a UI deve dar feedback contínuo.
- Sem coleta de dados pessoais na v1. Se logar URLs para debug, anonimizar e avisar.
