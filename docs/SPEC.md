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
  "score": { "value": 72, "band": "high | medium | low | indeterminate | out-of-scope" },
  "wrinkle": "low | medium | high | unknown",
  "brandMatch": { "name": "Asket", "noteKey": "result.brandMatch", "ref": true, "matchLevel": "product | category | brand", "reference": { "product": "The T-Shirt", "confidence": "verified | partial", "tier": "A+", "fiber": "100% organic long-staple cotton", "gsm": 180, "weave": "jersey", "origin": "Portugal", "wrinkle": "low" } },
  "recommendations": [ { "brand": "Merz b. Schwanen", "product": "215 Loopwheeled T-Shirt", "category": "tshirt", "tier": "S+", "fiber": "100% GOTS organic cotton", "gsm": 244, "wrinkle": "low", "url": "https://merzbschwanen.com" } ],
  "image": "https://shop.example.com/product.jpg (opcional; servida via /api/image)",
  "confidence": "verified | partial | unreadable",
  "rawNotes": "string opcional para debug (não exibir ao usuário final)"
}
```

> **Nota de implementação (2026-06-07):** as chaves do contrato são **camelCase** no código (`messageKey`, `noteKey`), não snake_case. `brandMatch` devolve `noteKey: "result.brandMatch"` (chave de i18n), não um texto pronto — o frontend traduz. `findings.gsm` pode incluir `note: "derived from oz/yd²"` quando convertido de onças. Tipos canônicos em `lib/types.ts`.

**Response (não foi possível ler):**
```json
{ "status": "unreadable", "reason": "anti-bot | js-heavy | not-found | timeout | blocked | rate-limited", "messageKey": "error.unreadable" }
```

> **Nota de segurança (2026-06-14):** `reason: "rate-limited"` acompanha um HTTP **429** + header `Retry-After` quando o IP excede o limite (30/min) — ver DECISIONS §2 e §5.4. URL inválida continua retornando **400**; URL que aponta para host interno/privado (guarda anti-SSRF) retorna `reason: "blocked"`. O frontend trata qualquer `status: "unreadable"` como o estado de erro honesto.

Regras:
- Todo texto exibível ao usuário vem por **chave de i18n** (`messageKey`/`noteKey`), nunca string pronta da API. A API devolve chaves + dados; o frontend traduz. (Exceção: valores extraídos como "100% organic cotton" são dados, exibidos como vêm.)
- `verified: true` = o dado foi lido da página. `verified: false` = inferido/ausente. A UI deve diferenciar visualmente.

## 4. Como renderizar o resultado

> **Apresentação atual (redesign 2026-06-10):** o resultado é exibido como uma **etiqueta de composição** (creme sobre o palco preto; ilhós, costura tracejada, dados em monospace, ícone de ferro no "amassa?", selo AUDITED). A **ordem abaixo é preservada** — muda só a forma.

Ordem sugerida, escaneável:
1. **Categoria detectada** (com ícone) + aviso discreto se `categoryConfidence: low`.
2. **Veredito principal** — band do score traduzido (Alta / Média / Baixa / Indeterminada / Fora do nosso critério) com cor.
3. **"Amassa muito?"** — resposta direta (Pouco / Médio / Muito / Não sei), porque é o objetivo central do dono.
4. **O que encontramos** — lista dos `findings` com `verified: true`, em linguagem simples.
5. **O que não foi possível confirmar** — lista de `missing` + findings `verified: false`. Apresentar como "a conferir na etiqueta", não como defeito.
6. **Marca auditada / Referência verificada** (se `brandMatch.ref`) — ver bloco da decisão #4 abaixo.
7. **Nível de confiança** — selo: Verificado / Parcial / Não foi possível ler.

> **Decisão #4 (2026-06-15) — referência verificada da KB para marcas auditadas.** Quando a URL é casada a um produto auditado (`matchLevel: product|category`), o `brandMatch.reference` traz nossos dados auditados. A UI mostra um bloco logo abaixo do veredito que **distingue três proveniências**: a banda computada (leitura **desta página**, não inflada), os specs **"verificado na fonte"** (FATO: fibra/GSM/tecelagem/origem — só quando `confidence: verified`), e o tier traduzido sob **"nossa avaliação"** (JULGAMENTO editorial, nunca "verificado"). É **nossa auditoria do produto**, separada dos `findings` lidos-da-página — não afirma que a página colada é aquele SKU exato (cautela de `brands.ts`). `partial` mostra rótulo brando, sem carimbar specs. Match por host com produto incerto (`matchLevel: brand`) mantém o selo genérico "Audited" sem tier. Racional/auditoria: `docs/plans/fase-b-decisao-4-kb-verificada.md` + `docs/audit/AUDIT-fase-b-decisao-4-2026-06-15.md`.

> **Fase B (2026-06-15) — de crítico a conselheiro:**
> - **Foto do produto:** se `image` veio na resposta, é exibida no topo da etiqueta, servida **same-origin** via `GET /api/image?src=` (proxy com guarda anti-SSRF + cap de 8 MB + só content-type de imagem). Mantém a CSP fechada (`img-src 'self'`) e não vaza referrer. Ausente quando a página não expõe `og:image`/JSON-LD image (best-effort, sem inventar).
> - **Recomendações (`recommendations`):** bloco **visualmente separado do veredito** (painel escuro, não a etiqueta creme) com até 3 peças auditadas da MESMA categoria que confiamos, ordenadas por tier, excluindo a marca do match. Enquadramento honesto ("peças que confiamos nesta categoria"), nunca "melhores que a sua". Vazio para hoodie/pullover/unknown (a KB só cobre tshirt/shirt) → seção não aparece. **Aparece mesmo quando o veredito é `out-of-scope`/`indeterminate`** (a abstenção vira conselho).
> - **Compartilhar veredito:** botão "Share" copia uma URL `/share?b=&c=&w=&s=&f=&l=` que **codifica o veredito já computado** (não re-busca a loja → sem novo vetor de SSRF/custo). `/share` é SSR com OpenGraph apontando para `GET /api/og?` (imagem 1200×630 do veredito, na identidade Noir, gerada com `next/og`).

Se `score.band` for `indeterminate` (ex.: 100% algodão confirmado mas sem GSM nem tecido), o veredito deve dizer claramente que **falta dado para concluir**, não dar nota baixa por omissão.

Se `score.band` for `out-of-scope` (fibra dominante fora do critério — poliéster, seda, linho, lã não-merino, viscose; ver PARSER §5, Fase A 2026-06-15), o veredito deve dizer honestamente que **ainda não avaliamos essa fibra** (chave i18n `result.outOfScope`), **sem** número de score e **sem** linha de confiança (que pareceria contradizer a abstenção). O `wrinkle` e os `findings` lidos continuam sendo mostrados. Distinto de `indeterminate` (lá falta dado; aqui há dado, mas falta critério).

## 5. Requisitos não-funcionais

- Mobile-first; a maior parte do uso será no celular dentro da loja.
- Acessibilidade: teclado, foco visível, contraste AA, `html lang` correto, `aria-live` no estado analyzing/result.
- Performance: a animação não pode travar; o gargalo é a API, então a UI deve dar feedback contínuo.
- Sem coleta de dados pessoais na v1. Se logar URLs para debug, anonimizar e avisar.
