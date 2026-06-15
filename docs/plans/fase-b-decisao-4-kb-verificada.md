# Plano — Fechar a #4: dados verificados da KB para marcas auditadas

> **Status:** ✅ **EXECUTADO** (2026-06-15) — matcher + contrato + API + UI + i18n + testes + docs. 116 testes verdes, lint/build limpos, data-path confirmado por curl ao vivo (Norse → matchLevel product, reference S+ verificado, banda computada "medium" inalterada). **Visual (Docker MCP) pendente** — o servidor MCP desconectou nesta sessão; validar a renderização do bloco quando reconectar, antes de deploy. · **Criado:** 2026-06-15 · **Revisado:** 2026-06-15 · **Modelo:** Option B (escrever → aprovar → executar, CLAUDE.md §5).
> Origem: auditoria `docs/audit/AUDIT-fase-a-b-release-2026-06-15.md` (pendência #4) + os dados A2.4 (`DECISIONS.md §5.4`, 2026-06-15) que mostraram subavaliação ampla de peças premium auditadas.
>
> **Revisão pós-auditoria (`docs/audit/AUDIT-fase-b-decisao-4-2026-06-15.md`, 2026-06-15) — 4 riscos verificados, todos aceitos e baked-in:**
> 1. **Limiar de match distintivo (Risco 1):** "≥2 tokens em comum" é fraco — "The **Perfect** T-Shirt" vs "The **Heavyweight** T-Shirt" compartilham "the"+"t-shirt". O match por produto exige um **token DISTINTIVO** (após remover stopwords genéricos: the/a/shirt/t-shirt/tee/cotton/marca/cores/mens…), e vencer os demais produtos por esse token. Em empate/dúvida → category/brand-level. — passo 1.
> 2. **Reconciliar com a variância de SKU (Risco 2):** `brands.ts:16` adverte que a API **não** injeta dados de produto em `findings` "porque a URL colada pode não ser aquele SKU exato (Hollister washed 250 GSM)". O bloco verificado **não** recria esse risco porque é rotulado como **"nossa auditoria deste produto"** (referência da KB), nunca como "lido desta página" — ver §"Reconciliação SKU". — passo 4.
> 3. **Gate em `confidence === "verified"` (Risco 3):** 9 produtos da KB são `confidence: "partial"` (Kiton, Borrelli, Hast, Dudalina, Pompeii, Ulriken, UNIQLO Supima, Vans…). O bloco "verificado na fonte" **só** aparece para `verified`; `partial` recebe rótulo mais brando (sem carimbar specs como totalmente verificados). — passos 2/4.
> 4. **Separar fato de julgamento (Risco 4):** `tier` é **julgamento editorial**, specs (GSM/fibra/origem) são **fato verificado**. Rótulos distintos: specs = **"verificado na fonte"**; tier = **"nossa avaliação"**. Nunca carimbar o tier como "verificado". — passos 4/5, decisão #C.

## Problema (medido, não suposto)

A banda computada lê só a página, e o rubric fibra-primeiro não credita Giza/egípcio, construção napolitana nem `modal` (parser ainda não os reconhece). Resultado A2.4: **Kiton (A+) → low**, **Finamore Giza 45 (S) → medium**, Asket Overshirt (S+) → medium, ISTO./Asphalte (A+) → medium, Insider Heavy (A+) → low. Hoje a UI mostra só um selo genérico "Audited" (sem tier), então uma casa que **nós mesmos verificamos contra a fonte** pode aparecer com veredito "low/medium".

A decisão #4 ("a banda cede ao selo") foi **diferida** porque exigia (a) `tier` no `BrandMatch` e (b) match por **produto** (o match atual é por host). Este plano constrói exatamente isso — mas de forma honesta: **não inflamos a banda computada**; adicionamos um bloco de **referência verificada** (alta confiança, claramente rotulado "verificado por nós") ao lado da leitura da página.

## Princípio (inegociável)

Três proveniências, sempre distinguíveis na UI:
1. **Lido da página** (findings `verified`) — o que a loja declara.
2. **Verificado por nós** (KB) — auditado contra a fonte oficial; sinal de **alta confiança**.
3. **Computado** (banda/score) — inferência do nosso rubric sobre o texto da página.

A banda computada **permanece honesta** (lê a página). Nunca atribuir o tier de um produto específico sem confiança de match razoável (senão seria inventar).

## Contexto de código (verificado 2026-06-15)

- `matchBrandByHost(host)` casa por host e devolve `AuditedBrand` (com `products[]`). O `route.ts` usa só `brand.name`.
- `AuditedProduct`: `product, category, fiber, fiberType, gsm, weave, construction, origin, wrinkle, tier, confidence`. **Sem URL/slug** → casar produto é heurístico (slug↔nome).
- `BrandMatch = { name, noteKey, ref }` — sem tier.
- Slugs reais batem com nomes por overlap de tokens (ex.: `…heavy-loose-t-shirt…` → "Heavy Loose T-Shirt"; `the-perfect-t-shirt-white` → "The Perfect T-Shirt", distinto de "The Heavyweight").

## Passos

### 1. Casamento por produto — `lib/knowledge/matchProduct.ts` (puro, testável)
`matchAuditedProduct({ host, url, category }) → { brand, product, matchLevel } | null`
- `matchLevel: "product" | "category" | "brand"`.
- **product (limiar distintivo — Risco 1):** tokeniza o slug da URL e o nome de cada produto; remove **stopwords genéricos** (the/a/of/and/with/mens/womens/cores; e termos não-distintivos no contexto: shirt/t-shirt/tee/cotton/+ o nome da marca). O produto vencedor precisa compartilhar **≥1 token DISTINTIVO** (ex.: "perfect", "heavyweight", "overshirt", "oxford", "falster", "loopwheeled") **e** superar estritamente os demais produtos da marca. Empate ou nenhum token distintivo → **não** é product match.
- **category:** sem product confiável, se a marca tiver **exatamente 1** produto na `category` parseada → esse produto.
- **brand:** caso contrário (marca casada, produto incerto) → sem produto específico.
- **Regra anti-engano:** só expõe tier/specs quando matchLevel for `product` ou `category`. Em `brand`, mantém o selo genérico atual (sem tier/specs).
- A função carrega `product.confidence` adiante (para o gate do Risco 3).

### 2. Contrato — `lib/types.ts`
Estender `BrandMatch`:
```ts
interface BrandMatch {
  name: string;
  noteKey: "result.brandMatch";
  ref: boolean;
  matchLevel: "product" | "category" | "brand";
  // presente só em product/category. `confidence` espelha o BrandConfidence da KB
  // (verified|partial) e gateia a apresentação (Risco 3). `tier` é JULGAMENTO
  // editorial; os demais campos são FATO verificado na fonte (Risco 4).
  reference?: {
    product: string;
    confidence: "verified" | "partial";
    tier: string;
    fiber: string | null;
    gsm: number | null;
    weave: Weave | null;
    origin: string | null;
    wrinkle: Wrinkle;
  };
}
```

### 3. API — `app/api/analyze/route.ts`
Trocar `matchBrandByHost` por `matchAuditedProduct({ host, url, category: parsed.category })`; popular `reference` quando matchLevel for product/category. (As recomendações continuam excluindo a marca casada.)

### 4. UI — `components/ResultCard.tsx`
Quando `brandMatch.reference` existir, **substituir o callout interino** por um bloco de referência logo abaixo do veredito, com **rótulos distintos por proveniência (Risco 4):**
- **Specs (FATO):** fiber/GSM/weave/origin via `finding.*`, sob o rótulo **"verificado na fonte"** (`result.verifiedAtSource`).
- **Tier (JULGAMENTO):** traduzido para linguagem simples, sob o rótulo **"nossa avaliação"** (`result.ourRating`) — nunca "verificado".
- **Gate de confiança (Risco 3):** o rótulo "verificado na fonte" e os specs só aparecem quando `reference.confidence === "verified"`. Para `partial`, usar rótulo mais brando ("referência parcial; confirme na etiqueta") e **não** exibir specs como verificados.
- A banda computada continua exibida como **leitura da página** (sem inflar). Sem `reference` (brand-level), mantém o callout genérico atual.

### 4b. Reconciliação com a variância de SKU (`brands.ts:16`) — Risco 2
O cabeçalho de `brands.ts` evita injetar dados de produto em `findings` porque a URL pode não ser o SKU exato. Este bloco **não** recria esse risco porque é semanticamente **"nossa auditoria deste produto/linha"** (referência da KB), apresentado **separado** dos `findings` lidos-da-página, e nunca afirma "esta página tem X". O copy deve dizer **"auditamos [produto]: …"**, não "este item é …". Atualizar o comentário de `brands.ts` para apontar que a exibição como **referência rotulada** (≠ `findings`) é a fronteira que mantém a cautela.

### 5. i18n (4 idiomas, paridade por teste)
Chaves novas: `result.referenceTitle` (título do bloco), `result.verifiedAtSource` (rótulo dos specs factuais), `result.ourRating` (rótulo do tier-julgamento), `result.referencePartial` (rótulo brando para `partial`), e `result.tier.*` (tradução do tier para linguagem simples). Reusar `finding.*` para specs. Sem travessões.

### 6. Testes
`matchProduct.test.ts`: **token distintivo** (SANVT "Perfect" vs "Heavyweight" → match só com o token distintivo, não com "the"+"t-shirt"; Norse "Heavy Loose" vs "Oxford"; Asket "T-Shirt" vs "Overshirt"); category-unique; brand-only; host desconhecido → null; e um caso `partial` (ex.: Kiton) → `reference.confidence === "partial"`. `route.test.ts`: popula `reference` (verified e partial). Baseline conforme necessário.

### 7. Docs
`SPEC §3` (contrato `brandMatch.reference`/`matchLevel`/`confidence`), `DECISIONS §5.4` (fechamento da #4), marcar #4 como **fechada** no plano da Fase A.

## Pontos de decisão — DECIDIDOS (alinhados à auditoria de 2026-06-15)
1. **#A — Match:** ✅ precisão > cobertura **com limiar de token DISTINTIVO** (não só ≥2 comuns); em dúvida → brand-level sem tier/specs. (Risco 1.)
2. **#B — Apresentação:** ✅ bloco de referência **ao lado da** banda (três proveniências distinguíveis). **Não** liderar com o veredito da KB.
3. **#C — Tier:** ✅ traduzir para linguagem simples **e** rotular como **"nossa avaliação"** (julgamento); specs factuais sob **"verificado na fonte"**. (Risco 4.)
4. **#D — Parser egyptian/modal:** ✅ **diferido** (motor + regra anti-inflação; item separado, não empilhar neste release).
5. **Gate `partial` (Risco 3):** ✅ bloco "verificado na fonte" só para `confidence === "verified"`; `partial` com rótulo brando.
6. **Variância de SKU (Risco 2):** ✅ reconciliado em 4b (referência rotulada ≠ findings; copy "auditamos [produto]").

## Fora de escopo
Parser egyptian/modal (#D); links de afiliado; banco/cache/analytics (Fase C).

## Ordem de execução (se aprovado)
matcher + testes → contrato → API → UI (substitui o interino) → i18n → docs → validação (`lint`/`test`/`build` + visual via Docker MCP com: Norse Heavy Tee (verified), SANVT Perfect vs Heavyweight (token distintivo), uma marca auditada subavaliada hoje (ISTO. oxford / Finamore), e um `partial` (Kiton) para conferir o rótulo brando).
**Commits por sub-passo** (retomando a disciplina que a auditoria pediu).
