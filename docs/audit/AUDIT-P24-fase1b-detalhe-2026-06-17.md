# Auditoria — Detalhamento da Fase 1b (escopo por produto do JSON island)

> **Data:** 2026-06-17 · **Auditor:** revisor independente (chat), contra o código em disco **e contra dados ao vivo do Norse**.
> **Objeto:** a seção "Detalhamento da Fase 1b" anexada a `docs/plans/P2.4-proveniencia-por-campo.md`.
> **Método:** leitura do detalhamento + verificação contra o código real (`extract/index.ts`: `productUrlTokens`, `collectMaterialValues`, `embeddedJsonText`, `extractText`) + **fetch ao vivo do produto Norse motivador** (HTML renderizado + `.json` do Shopify) para validar as premissas dos riscos.

---

## Veredito

Plano **sólido**; a decisão de design (1b.1) é **melhor** do que a minha adenda sugeriu (não reescrever — adicionar função nova ao lado). O Claude Code **respeitou o gate**. **A validação ao vivo do Norse mudou a minha avaliação dos dois riscos** — o Risco 1 está **CONFIRMADO com dados reais**; o Risco 2, como eu o havia formulado (`__NEXT_DATA__`), **NÃO se aplica ao Norse** e foi corrigido para um achado mais fundamental: **a composição do Norse não está num JSON island escopável, então a 1b pode não resolver o próprio caso motivador.** Execução segue retida; aprovável para o gate formal **após** os reparos.

---

## ✅ Verificado / crédito

1. **1b.1 — adicionar `embeddedFiberCandidate` ao lado, sem reescrever `collectMaterialValues`: melhor que a adenda.** O caminho do blob fica byte-idêntico → **corpus diff = 0 por construção**, Gap/Armani preservados. Correção honesta e de menor risco.
2. **Reuso de `productUrlTokens` é legítimo** (existe; path ≥4 + grupos `/\d{4,}/g`). Propagação de identidade com **reset** é a ideia certa contra related aninhado.
3. **1b.8 decisões certas:** chaves precisas (`handle/slug/sku/id/...`), nunca `name`/`title`. #1b-B (sem tokens → não emitir) é o conservador correto.

---

## ⚠️ Risco 1 — CONFIRMADO com dados reais do Norse: falso-casamento por dígito

**No código:** o token de dígitos é `/\d{4,}/g` sobre a **URL inteira**. **Dados reais do Norse (`.json` ao vivo):** o `product_id` é `15532138692939`; os `variant.id` são `56535173103947`, `56535173136715`, … repetidos em **cada** objeto variante; os SKUs são `N01-0679-0001-XS` etc. O **handle não contém dígitos** (`norse-standard-heavy-loose-t-shirt-white`).

- Uma URL de produto Shopify com `?variant=56535173103947` (forma padrão de linkar variante) gera esse variant-ID como token. Esse mesmo número aparece repetido no JSON → um nó vizinho que **referencie** esse variant-ID casaria por engano.
- **Na composição (1b)** um falso match faria a fibra do vizinho virar `scope:"product"` e **vencer o blob** — reintroduzindo o risco-vizinho que a 1b existe para fechar.
- O fixture anti-vizinho do plano usa `handle` → **não pega** esse caso.

**Reparo exigido:** (a) fixture "vizinho casa por grupo-de-dígitos, handle diferente → NÃO vira candidato"; (b) regra: **match por `handle`/`slug` exato confere `product`; match só-por-dígitos não basta** (tratar como `none`/não-emitir, ou exigir corroboração do handle). Os dados do Norse mostram que o handle é o sinal forte; os dígitos são ruidosos e repetidos.

## ⚠️ Risco 2 — CORRIGIDO após dados reais: a 1b pode não resolver o Norse (o caso motivador)

> **Auto-correção:** na 1ª versão desta auditoria afirmei que o Norse aninha o produto sob nós `__NEXT_DATA__` de routing e que o "reset agressivo" ocultaria a composição. **Isso estava errado quanto ao Norse** — verifiquei ao vivo: **o Norse é Shopify, não Next.js.** Corrijo abaixo com o que os dados realmente mostram.

**Dados reais do Norse (`.json` + página renderizada):**
- A composição **não está em campos estruturados** do produto. O `.json` traz `product_type: "T-Shirts Shirt Sleeve"` e a fibra/GSM ("100% Organic Cotton — 260 GSM") aparece **como prosa dentro do `body_html`** (descrição), não como chave material num JSON island.
- O `<script type="application/json">`/`__NEXT_DATA__` que `collectMaterialValues`/`embeddedFiberCandidate` visam **pode nem conter** a composição nesta loja.

**Consequência (mais fundamental que o reset):** o caso motivador citado **no próprio plano** — "Norse leu `source=undefined` porque a composição veio do JSON island, que 1a não atribui" — **pode estar mal-diagnosticado.** Se a composição do Norse chega por `body_html`/descrição, ela é capturada pelo **texto visível** (já um candidato `visible-text`/`page` na 1a) ou pelo **JSON-LD** (se o tema o emitir — já coberto na 1a), **não** pelo JSON island que a 1b vai escopar. Nesse cenário a 1b **não muda o resultado do Norse**.

**Reparo exigido (substitui o "validar o reset"):** **antes de construir a 1b, confirmar empiricamente ONDE a composição de cada loja-alvo realmente vive.** Pegar o HTML cru de Norse + Gap + Armani e verificar: a fibra está em (a) JSON-LD `Product` [1a já cobre], (b) `<script application/json>` island escopável [1b alvo], ou (c) prosa em `body_html`/descrição [texto visível já cobre]? **A 1b só se justifica para lojas onde a composição está REALMENTE num JSON island com múltiplos produtos.** Se Gap/Armani forem desse tipo (o plano os cita como motivação do passo B), a 1b vale; se o Norse não for, ele sai da lista de casos da 1b. Sem essa verificação, a 1b corre o risco de ser engenharia para um problema que aquela loja não tem.

> O reset-em-`nomatch` ainda merece a salvaguarda que sugeri (só dar `nomatch` em nós com marcador de produto, para um `id` de routing não resetar a árvore) — mas isso é secundário ao achado maior: **confirmar que o JSON island é mesmo a fonte, por loja, antes de construir.**

---

## ✅ Pontos já corretos
- 1b.4 (candidato escopado vence o blob → veredito do produto casado deixa de vir do blob contaminado): melhoria de honestidade real — **válida para as lojas onde a fonte é de fato o JSON island** (a confirmar, Risco 2).
- 1b.6: cap de profundidade ok; falso-match por dígitos **parcialmente** reconhecido (sem o fixture do Risco 1).
- 1b.7 checklist bom; faltam as linhas dos Riscos 1–2.

---

## 🔒 Fronteira de verificação
- **Verificado em disco:** `productUrlTokens`, `collectMaterialValues` (empilha por label, sem escopo), `embeddedJsonText` (alimenta o blob), integração de candidatos em `extractText`.
- **Verificado ao vivo (Norse):** `.json` do produto (product_id/variant ids/SKUs/handle reais → Risco 1 confirmado) e a página renderizada (composição em `body_html`/prosa, não em campo estruturado → Risco 2 corrigido). **NÃO** re-fetchei Gap/Armani — daí o reparo do Risco 2 pedir essa verificação por loja antes de construir.
- **NÃO verificado:** execução de testes/runtime (sem runner).

---

## Recomendação ao dono
1. **Não aprovar a execução da 1b ainda.** Pedir ao Claude Code, antes do gate formal:
   - **Risco 1 (confirmado):** fixture de vizinho-por-dígito + regra "handle/slug exato confere `product`; dígito-solto não basta".
   - **Risco 2 (corrigido):** **mapear, por loja-alvo (Norse, Gap, Armani), onde a composição realmente vive** (JSON-LD / JSON island / prosa). Construir a 1b só para as lojas cuja composição está mesmo num JSON island multi-produto. Reavaliar se o Norse pertence à 1b ou já é resolvido pela 1a (visible-text/JSON-LD).
2. **Sequência mantida:** detalhar (com os 2 reparos) → auditoria independente → aprovação → executar sob gate de diff.
3. A **arquitetura** (função nova ao lado, blob intacto, precedência) está **correta**; os reparos são de evidência/regra/fixture, não de redesenho.

> **Resumo:** 1b com boa arquitetura e gate respeitado. Validação ao vivo do Norse **confirmou** o Risco 1 (falso-casamento por dígito — handle deve mandar) e **corrigiu** o Risco 2: o Norse é Shopify e expõe a composição em prosa, não num JSON island — então a 1b talvez não resolva o próprio caso motivador. Antes de construir, mapear por loja onde a fibra realmente vive. *(Esta versão corrige uma suposição `__NEXT_DATA__` da 1ª passada, agora checada ao vivo.)*
