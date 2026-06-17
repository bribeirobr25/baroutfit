# Adenda à auditoria — L-A verificado vivo + detalhamento do P2.4 (Fase 1)

> **Data:** 2026-06-17 (posterior a `AUDIT-standards-e-planos-LA-P24-2026-06-17.md`) · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** o update do Claude Code reportando (1) L-A no ar e (2) o "Detalhamento de execução" anexado a `docs/plans/P2.4-proveniencia-por-campo.md`.
> **Método:** leitura direta de `lib/extract/index.ts`, `lib/parser/index.ts`, `lib/parser/tokens.ts` (+ `evaluate.ts` de leituras anteriores) e do plano P2.4 detalhado. Cada afirmação verificável foi conferida contra o código.

---

## Veredito resumido

O Claude Code **respeitou o gate** (detalhou, não executou; "não posso me auto-aprovar"). Verifiquei: **L-A está correto no código**; a tese central do P2.4 (adaptador sem tocar os token extractors; fallback byte-idêntico) é **verdadeira e bate com o código**. **Mas** o detalhamento da Fase 1 contém **uma subdescrição que precisa ser corrigida antes de executar**: ele trata `scope` como "rotular o que já coletamos", quando na verdade o `scope` por produto **não existe no código** e precisa ser **construído** — em especial para o `embeddedJsonText`. Esta é a condição a resolver no plano antes do OK da Fase 1.

---

## ✅ Verificado no código (não inferido)

### L-A — correto e coerente com o plano
- `fetchPage` (`extract/index.ts`) agora tem o gate prometido: página **não-thin** → `hasFabricSignal` (inalterado); página **thin** → só passa se `hasFiberSignal(t) && hasGsmSignal(t)`. Confirmado.
- Os helpers existem: `hasFiberSignal` / `hasGsmSignal`, e o `GSM_SIGNAL_RE` exige **dígito adjacente** à unidade (guarda anti-prosa que o plano prometeu). `hasFabricSignal = fiber || gsm` preservado para os chamadores existentes. Confere.
- Decisão #L-A-1 (completo = fiber+gsm) está no código. **L-A: aceito.** (Smoke/deploy ao vivo são claim do Claude Code — ver fronteira.)

### P2.4 — a tese de segurança é verdadeira
- `parse()` (`parser/index.ts`) roda cada token extractor sobre **um único `text` normalizado** e monta `findings`. É a junção com perda (L-C), como o plano diz.
- O fallback proposto para `fiber` no adaptador — `{ value: fiberDisplay, verified: fiberDisplay != null }` — é **byte-idêntico** à linha que existe hoje em `index.ts`. Logo "sem candidato → idêntico ao de hoje" é **verdade verificável** → corpus-invisível quando não há candidato, e reversível. **#P2.4-D (adaptador, não rewrite) está bem fundamentado.**

---

## ⚠️ Achado que condiciona a Fase 1 — `scope` é capacidade NOVA, não rotulagem

O detalhamento diz (passo 2) que vai **rotular o que "já coletamos hoje"** com `source`+`scope`, listando o `embeddedJsonText` como `scope:"product"` **se** casar handle/SKU, senão `"catalog"`. Verifiquei o código real:

1. **Não existe `scope` em lugar nenhum** do parser nem do `extractComposition` (`tokens.ts`): o `extractComposition` recebe o blob e regexa composições **sem saber a origem**. Confirmado.
2. **O `embeddedJsonText`/`collectMaterialValues` (`extract/index.ts`) NÃO casa handle/SKU.** A defesa que ele tem hoje é **anti-ruído por label** (`MATERIAL_KEY_RE` exige a palavra "material/composition/…" como chave ou label de spec-row). Isso **não é** defesa anti-vizinho por escopo: dentro de um `__NEXT_DATA__` com vários produtos, um valor "material" de um **vizinho** seria coletado igual. O próprio comentário do código reconhece isso ao manter `__NUXT__` **deferido (#P2-B)** "precisely because they aren't scoped to the viewed product".

**Consequência:** a Fase 1 (fiber) do P2.4, para emitir um candidato `embedded` com `scope:"product"` **confiável**, precisa **construir** a lógica de casamento por handle/SKU — que hoje **não existe**. O detalhamento a descreve como "rotular", subestimando o trabalho e o risco. Sem essa lógica, a Fase 1 só teria duas saídas, ambas ruins:
- rotular JSON island como `product` **sem base** → reabre o risco-vizinho que o A3/#P2.4-B existem para fechar; ou
- jogar todo JSON island em `catalog` e **descartá-lo** (#P2.4-B) → perde exatamente as lojas (Gap/Armani) que motivaram a extração de JSON embutido no passo B.

> **Nota de honestidade (auto-correção):** na minha resposta ao dono eu disse que o `embeddedJsonText` casaria "handle/SKU". Revendo o código, ele **não** casa — usa label "material". O ponto de fundo (falta escopo-por-produto) permanece e fica **mais** forte; corrijo só a mecânica.

**Recomendação:** antes do OK da Fase 1, o plano deve declarar explicitamente que **construir o `scope` por produto do `embeddedJsonText` (casar handle/SKU) faz parte da Fase 1** — com seu próprio fixture reproduzindo "vizinho no mesmo blob NÃO vira candidato product". Para as fontes que **já são** escopadas (`jsonLdNodes`, que só lê nós `Product` via `isProductType`), rotular como `scope:"product"` é, aí sim, só rotulagem — e a Fase 1 poderia começar **só por elas**, deixando o JSON island para quando o escopo estiver construído.

---

## ⚠️ Riscos do áudite anterior que seguem de pé (para a auditoria pré-execução formal)
- **Precedência vs. fontes de página:** `metaDesc`/`ogTitle` são `scope:"page"`. A precedência (`structured+product → meta → visible-text → reader`) precisa garantir que um candidato `meta`/`page` **não** vença de forma a reintroduzir dado genérico de página onde havia um estruturado de produto. Testar.
- **Checklist do auditor precisa ser EXECUTADO, não afirmado:** "corpus diff = 0 sem candidato" tem de ser provado rodando o snapshot, não declarado. (Eu não executo testes aqui — ver fronteira.)

---

## ✅ O que o detalhamento já acerta (crédito)
- Tipos aditivos (`candidates?`, `Finding.source?`) — não quebram consumidores. Correto.
- `scope:"catalog"` descartado na origem (#P2.4-B). Correto **onde o scope existir** (ver achado).
- Migração 1-campo-por-vez com corpus congelado + 4 fixtures (structured-beats-prose, neighbor-catalog-discarded, no-candidate-unchanged, source-recorded). Boa rede.
- Reconhece o gate: status "DETALHADO (pronto para auditoria)", execução retida. Comportamento certo.

---

## 🔒 Fronteira de verificação
- **Verificado em disco:** L-A (gate + helpers), a identidade do fallback do adaptador, a ausência de `scope` no parser/`extractComposition`, a defesa por-label (não por-escopo) do `embeddedJsonText`.
- **NÃO verificado (claims do Claude Code):** `pnpm smoke` passando, deploy do L-A no ar/healthy, "109 testes verdes". Sem runner/execução aqui. Não re-rodei URLs.

---

## Recomendação ao dono
1. **L-A:** aceito (verificado no código). Nada a fazer.
2. **P2.4 — ainda NÃO aprovar a Fase 1.** Pedir ao Claude Code para **corrigir o detalhamento**: declarar que construir o `scope` por produto do `embeddedJsonText` (handle/SKU) é parte da Fase 1 **com fixture anti-vizinho**, OU começar a Fase 1 **só pelas fontes já escopadas** (`jsonLdNodes`) e tratar JSON island numa sub-fase posterior, quando o escopo existir.
3. Manter os dois riscos remanescentes (precedência; checklist executado) como itens obrigatórios da auditoria pré-execução, que continua sendo o próximo passo — não a execução.

> **Resumo:** L-A verificado e correto. A arquitetura do P2.4 é sólida e a tese do adaptador é verdadeira no código. O único bloqueio real da Fase 1 é que o `scope` por produto **não existe hoje** (especialmente no `embeddedJsonText`, que se defende por label, não por escopo) — é capacidade a construir, não rótulo a aplicar. Resolver isso no plano antes do OK. Claims de runtime continuam do Claude Code, não desta auditoria.
