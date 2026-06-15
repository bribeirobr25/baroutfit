# Auditoria — Release Fase A + B + redesign (commit 3f6b268)

> **Data:** 2026-06-15 · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** o release que o Claude Code reportou como "Fase A + Fase B + redesign Atelier", commit `3f6b268` em `main`.
> **Método:** leitura direta dos arquivos em disco (`lib/parser/`, `lib/knowledge/`, `lib/types.ts`, `app/api/`, `components/`). Verificação cruzada contra o plano `docs/plans/fase-a-abstencao.md` e as 7 decisões do dono.
>
> ## ⚠️ ERRATA (2026-06-15, posterior) — corrigindo a seção "❌ Decisão #4 NÃO implementada"
> A seção abaixo afirma que a decisão #4 era "uma pendência DECIDIDA que ficou de fora do release". **Isso está incorreto e é retratado aqui.** Releitura do plano `docs/plans/fase-a-abstencao.md` mostra que a #4 foi **deliberadamente DIFERIDA para a Fase B pelo dono** (2ª revisão do plano), por um motivo fundamentado no código: `BrandMatch` (`types.ts`) **não carrega `tier`**, o match é por **host** (não por produto), e a UI mostra um selo **genérico "Audited" sem tier**. Logo **não existe hoje a contradição "Audited A+ / banda medium"** que esta auditoria alegou "poder acontecer" — porque nenhum tier é exibido. O erro foi meu: inferi a contradição sem reconferir que o selo é tier-less.
> **O que permanece válido:** a *preocupação de fundo* (peças premium auditadas computando medium/low) é real — confirmada depois pelos dados A2.4. Mas o caminho correto é a **Fase B** (match por produto + `tier`/specs verificados no `BrandMatch`, sem inflar a banda computada), não "a banda cede ao selo" na Fase A. Ver a auditoria seguinte `AUDIT-fase-b-decisao-4-2026-06-15.md` e o plano `docs/plans/fase-b-decisao-4-kb-verificada.md`.
> Mantenho o texto original abaixo **inalterado** (não reescrevo o histórico), apenas anoto a errata no topo.

---

## Veredito resumido

O release implementa a Fase A (abstenção honesta) e a Fase B (recomendações + foto + share) **com fidelidade ao plano**, salvo **uma decisão que NÃO foi implementada: a #4 (banda computada cede ao selo da KB)**. Há também uma nota de processo (bundling) e uma fronteira de verificação (claims de runtime não checados aqui).

---

## ✅ Confirmado em disco (verificado, não inferido)

### Fase A — abstenção honesta
- **Banda `out-of-scope` existe** (`lib/types.ts`), com a distinção correta vs. `indeterminate` ("temos o dado, mas a fibra está fora do critério" vs. "falta dado"). Comentário documenta a intenção.
- **Escopo decidido pela COMPOSIÇÃO, não pelo `fiberType`** (Reparo #1) — `scoreFabric` chama `fiberScope(d.composition, d.fiberType)` (`evaluate.ts`), e `fiberScope` (`tokens.ts`) decide a partir das partes da composição. O comentário afirma explicitamente "Decided from the composition, never from fiberType".
- **Corte de blend ≥ 60%** (Reparo #2 / decisão #6) — `IN_SCOPE_MIN_PCT = 60` em `tokens.ts`; soma as % das fibras in-scope; blend de duas in-scope (ex.: 50% cotton + 50% TENCEL) soma 100% e fica in-scope; sem %, in-scope só se todas as fibras forem in-scope.
- **O falso `low` do poliéster foi removido** — não há mais o caminho `highPolyester → low`; poliéster > 40% agora é só penalidade de −15, não força banda baixa.
- **`wrinkleVerdict` preservado** — linho → high, poli ≥ 50 → low, malha → low continuam.

### Fase A — desacoplar orgânico (A2)
- **`FIBER_QUALITY.organic` rebaixado de 2 → 1** (`guide.ts`), com comentário explicando que orgânico é agronomia/sustentabilidade, não comprimento de fibra.
- **`organic` removido de `goodFiber`** (`evaluate.ts`) — agora `goodFiber = premiumFiber || long-staple`.

### Decisões de UI implementadas
- **Decisão #5 (não exibir número em abstenção):** `ResultCard.tsx` tem `hideScore = indeterminate || out-of-scope` → o `value/100` e a barra não renderizam.
- **Decisão #7 (confiança reformulada em abstenção):** `{!isOutOfScope && (…confidence…)}` — rótulo de confiança suprimido quando out-of-scope, com comentário citando "decision #7". Mensagem `dict.result.outOfScope` exibida.

### Fase B
- **Recomendações** vêm de `recommendAlternatives` (`route.ts`), excluindo a marca casada; tipo `Recommendation` em `types.ts`; comentário reconhece que vem vazio para hoodie/pullover (a KB só cobre tshirt/shirt).
- **Foto do produto** via proxy same-origin `/api/image?src=…` (`ResultCard.tsx`), mantendo a CSP fechada.

### Estrutura nova confirmada
- `app/api/og/route.tsx`, `app/api/image/route.ts` (+ `.test.ts`), `app/share/page.tsx`, `components/Recommendations.tsx`, `components/FabricBackground.tsx`.
- **Rede de regressão (A0):** `lib/parser/__fixtures__/corpus.ts`, `lib/parser/__snapshots__/corpus.test.ts.snap`, `lib/parser/corpus.test.ts` — existem.

---

## ❌ Lacuna real — Decisão #4 NÃO implementada

**A decisão #4 (banda computada CEDE ao selo da KB quando há marca auditada) não está no código.** Verificado lendo **todos** os arquivos onde a lógica poderia estar: `parser/index.ts`, `route.ts`, `ResultCard.tsx`, `Shell.tsx`. É um negativo confirmado, não inferido.

- `route.ts` envia o `score`/`band` cru (correto — deve permanecer no JSON).
- `ResultCard.tsx` renderiza **sempre** a banda computada como veredito-título (`dict.result.band[band]`), e separadamente o selo "Audited". **Não há lógica fazendo o veredito ceder ao selo quando `brandMatch.ref === true`.**

**Por que importa:** a Fase A2 (rebaixamento de `organic`) é exatamente o que **torna a contradição mais provável**. Uma página ao vivo de marca auditada orgânica (ex.: ISTO., Asphalte) pode agora computar banda "medium" e exibi-la logo acima de um selo "Audited A+". Essa é a contradição que a #4 existia para evitar. A decisão foi tomada pelo dono e ficou de fora do release — é uma pendência decidida, não cosmética.

**Correção (escopo enxuto):** como `parser/index.ts` nem tem o `brandMatch` em escopo (a marca é casada depois, no `route.ts`) e o `route.ts` mantém a banda crua, a #4 é uma mudança **só de camada de apresentação** em `ResultCard.tsx`: quando `brandMatch.ref`, o veredito exibido defere ao tier auditado (ou ao menos não o contradiz), mantendo `score`/`band` no JSON para analytics. Adicionar um teste para o caso ISTO./Asphalte.

---

## ⚠️ Pendência de verificação — A2.4 (revalidação manual da KB)

O plano (A2.4) pedia, após rebaixar `organic`, revalidar à mão cada marca auditada orgânica (Asket, ISTO., Maison Cornichon, Norse orgânico, Merz GOTS, SANVT, Insider, Asphalte): comparar banda computada vs. tier editorial e registrar quais mudaram. **O release não menciona se isso foi feito.** Pendente confirmar com o Claude Code quais marcas auditadas mudaram de banda após `organic: 1` — é o insumo que torna a decisão #4 calibrável.

---

## 🟡 Nota de processo — bundling do commit

O release foi entregue como **um único commit** (Fase A + B + redesign), justificado por estarem "intermixed across shared files". É uma explicação razoável, mas vai contra a intenção do plano (`A0 → A1 → A2 → A3`, "um commit atômico por sub-passo", Fase A isolada e auditável, aterrissando antes de B/D). O trabalho parece feito e com gate verde, então é nota de processo, não de correção — mas a história "Fase A isolada e auditável" que projetamos não aconteceu como commits separados. Para os próximos passos (C/D), vale retomar o commit-por-sub-passo.

---

## 🔒 Fronteira de verificação (o que NÃO foi checado aqui)

Por honestidade do mesmo tipo que o app pratica, registro o que **não** verifiquei (são fatos de runtime/remoto, fora do filesystem):
- **"109 testes verdes"** — os arquivos de teste existem (incl. `corpus.test.ts`, `recommend.test.ts`, `image/route.test.ts`), então o número é plausível, mas **não foi executado nem confirmado** nesta auditoria.
- **Respostas HTTP ao vivo** (`/api/og` 200, `/api/image` 400, homepage com os novos marcadores) — **reportadas pelo Claude Code, não verificadas independentemente** aqui.
- **Push para produção / deploy promovido** — reportado, não verificado.

Estes itens são **reportados pelo Claude Code**, e não asserções desta auditoria.

---

## Próximos passos recomendados

1. **Fechar a decisão #4** (mudança em `ResultCard.tsx` + teste ISTO./Asphalte) antes de considerar a Fase A 100% concluída. Pode ir como handoff Option B (escrever → aprovar → executar).
2. **Confirmar A2.4** — pedir ao Claude Code a lista de marcas auditadas que mudaram de banda computada após o rebaixamento de `organic`.
3. **Sequência de produto:** fatia de **analytics cookieless** (parte leve da Fase C — componente, zero infra, preserva a postura sem-cookie) **primeiro**, para a Fase D (usuários reais) não ser cega. Cache/Upstash/tier "observado" + migração do rate-limit ficam para depois que D mostrar demanda.

> Resumo: release sólido e fiel ao plano, com **uma** pendência decidida (decisão #4) e **uma** verificação em aberto (A2.4). Os claims de runtime são do Claude Code, não desta auditoria.
