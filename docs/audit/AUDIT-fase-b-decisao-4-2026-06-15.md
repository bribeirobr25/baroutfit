# Auditoria — Plano Fase B (#4: dados verificados da KB) + update do Claude Code

> **Data:** 2026-06-15 (posterior à `AUDIT-fase-a-b-release-2026-06-15.md`) · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** (1) o update do Claude Code respondendo à auditoria anterior; (2) o novo plano `docs/plans/fase-b-decisao-4-kb-verificada.md`.
> **Método:** leitura direta de `lib/knowledge/brands.ts`, `lib/knowledge/recommend.ts`, `lib/types.ts`, `docs/plans/fase-a-abstencao.md` e o novo plano. Verificação cruzada das premissas de código que o plano afirma.

---

## 0. Auto-correção (precede o resto)

Esta auditoria **corrige um erro da auditoria anterior** (ver ERRATA no topo de `AUDIT-fase-a-b-release-2026-06-15.md`). Aquela auditoria classificou a decisão #4 como "pendência decidida que ficou de fora do release". **Estava errado:** o plano da Fase A, na 2ª revisão, registra que o dono **diferiu a #4 para a Fase B**, com fundamento no código (`BrandMatch` sem `tier`, match por host, selo genérico sem tier). O Claude Code apontou isso corretamente. Reconheço o erro: inferi uma contradição visível ("Audited A+ / medium") sem reconferir que **nenhum tier é exibido hoje**, logo não há contradição a resolver na Fase A. O update do Claude Code está certo nesse ponto.

---

## 1. Avaliação do update do Claude Code

- **#4 "não implementada" → discordância parcial, com razão.** Correto, conforme §0 acima. E o Claude Code agiu bem: **recusou** inflar a banda para casar com o tier editorial (violaria o princípio fundador) e aplicou só a versão honesta e branda (realocar o callout auditado para logo abaixo do veredito, para a banda não ser lida isolada). Julgamento principista.
- **A2.4 (revalidação) → executada.** O achado é **maior** do que a auditoria anterior supôs: a subavaliação não é só do `organic`, é do rubric fibra-primeiro não creditar Giza/egípcio, construção napolitana nem `modal`. Exemplos reportados: Asket Overshirt (S+)→medium, Merz 215 (S+)→medium, ISTO. (A+)→medium, Finamore Giza 45 (S)→medium, Kiton (A+)→low, Insider Heavy (A+)→low. **Consistência verificada contra o código:** Finamore é `egyptian`, Kiton/Borrelli são `generic`, Insider é `modal`, Asket Overshirt é `organic`(=1) + woven 308gsm — todos coerentes com computar medium/low no rubric atual. Os achados são plausíveis e batem com os dados da KB. (Não executei o scorer; é verificação estrutural, não numérica — ver §4.)
- **Bundling / verification boundary → aceitos e fechados pelo Claude Code** (re-curl de produção + suíte). Esses são claims de runtime do Claude Code (ver §4).

---

## 2. O novo plano faz sentido? Sim.

O design central — um bloco **"Referência verificada"** que **nunca infla a banda computada**, exibindo três proveniências distinguíveis (lido da página · verificado por nós · computado) — é a resolução **correta e honesta** da #4. É a versão da #4 que respeita o princípio fundador. Premissas de código do plano **verificadas e corretas**:
- `AuditedProduct` **não tem URL/slug** → match por produto é necessariamente heurístico (slug↔nome). O plano é honesto sobre isso.
- `BrandMatch` não tem `tier`; `matchBrandByHost` é por host. Confirma a diferição correta da #4.
- `recommend.ts` **já** encapsula o mesmo princípio que o plano invoca: recusa comparar banda computada com tier editorial porque "são escalas diferentes". Boa consistência.

---

## 3. Riscos a mitigar ANTES de executar (todos verificados no código)

### Risco 1 — match heurístico pode rotular errado, e o raio de dano é um selo "verificado".
Sem URL na KB, casar URL↔produto depende de overlap de tokens slug↔nome. Um match errado anexaria tier/specs errados sob o rótulo de **maior confiança** do app ("verificado por nós contra a fonte"). A regra "precisão > cobertura" (decisão #A) e o fallback brand-level são a mitigação certa, **mas o limiar importa muito**: "≥2 tokens significativos em comum" é fraco — "The Perfect T-Shirt" vs "The Heavyweight T-Shirt" compartilham "the"+"t-shirt". O plano já nomeia esse caso SANVT como teste, mas o limiar deve exigir o **token distintivo** ("perfect" vs "heavyweight"), não só dois quaisquer. É o ponto onde um bug vira desonestidade → mais cobertura de teste e tuning conservador.

### Risco 2 — variância de SKU (a própria KB adverte).
O cabeçalho de `brands.ts` diz explicitamente que a API **não** injeta dados do produto em `findings` "porque não podemos ter certeza de que a URL colada é aquele produto exato (SKUs diferem — Hollister washed 250 GSM)". O novo plano passa a exibir specs por produto (gsm/weave/origin) quando acha que casou. Não é necessariamente errado (é rotulado como referência da KB, não como lido-da-página), mas está **em tensão com a cautela documentada**. O plano deve **reconciliar explicitamente com esse comentário** do `brands.ts`, deixando claro por que o bloco rotulado "verificado por nós" não recria o risco que o comentário evita.

### Risco 3 — `partials` passariam a exibir tier.
Kiton, Borrelli, Hast, Dudalina, Pompeii são `confidence: "partial"` (sinal de construção real, mas sem GSM/contagem de fios verificados). Se o match por produto expuser o tier deles (A+, A) num bloco "Referência verificada", apresenta-se um `partial` como se fosse totalmente verificado. **O plano deve gatear o bloco `verified` em `product.confidence === "verified"`**, e mostrar `partials` com rótulo mais brando. Não vi essa distinção no plano — adicionar antes de executar.

### Risco 4 — o tier é JULGAMENTO, não fato; "verificado" deve recair sobre os specs.
A decisão #C (traduzir S+/A+ para "Topo de linha, verificado") é boa, mas o tier é explicitamente **julgamento editorial**, não fato medido (a KB é escrupulosa nessa linha em todo lugar). Carimbar o tier como "verificado por nós" borra a distinção fato/julgamento que é o coração do projeto. Rotular separado: **specs (GSM/fibra/origem) = "verificado na fonte"; tier = "nossa avaliação"**. Senão, um julgamento ganha o selo de fato.

---

## 4. Fronteira de verificação (não checado aqui)

- **"109 testes verdes", lint/build limpos, re-curl de produção (/api/og 200, /share 200, /api/image 400), validação visual via Docker MCP** — **reportados pelo Claude Code, não verificados independentemente** nesta auditoria. Os arquivos de teste/rotas existem em disco (plausível), mas não executei a suíte nem o runtime.
- Os números A2.4 (medium/low por produto) foram conferidos por **consistência estrutural** com `brands.ts` (fiberType/gsm/weave), **não** por execução do scorer.

---

## 5. Recomendações sobre as 4 decisões abertas do plano

- **#A (match):** concordar com precisão > cobertura, **mas apertar o limiar**: exigir token distintivo, não só 2 comuns. Em dúvida → brand-level sem tier.
- **#B (apresentação):** concordar com "ao lado, três proveniências". Não liderar com o veredito da KB.
- **#C (tier):** traduzir para linguagem simples, **mas** rotular tier como "nossa avaliação" e reservar "verificado na fonte" para os specs factuais (Risco 4).
- **#D (parser egyptian/modal):** concordar em **diferir** — é mudança de motor com regra anti-inflação (Giza certificado vs. egípcio genérico); juntar aqui repetiria a nota de processo "demais num release".
- **Adições (não estavam no plano):** gatear bloco `verified` em `confidence === "verified"` (Risco 3); reconciliar com o comentário de variância de SKU do `brands.ts` (Risco 2).

---

> **Resumo:** o update do Claude Code corrige um erro real da minha auditoria anterior (#4 foi diferida, não dropada) e executou o A2.4, cujos achados são consistentes com o código. O novo plano é sólido e honesto (não infla a banda; três proveniências). Aprovável **após** mitigar 4 riscos verificados: limiar de match distintivo, gate de `partial`, separar tier(julgamento) de specs(fato), e reconciliar com a cautela de SKU. Claims de runtime (109 testes, curls de produção) são do Claude Code, não desta auditoria.
