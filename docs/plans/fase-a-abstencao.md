# Plano — Fase A: parar de mentir com confiança

> **Status:** ✅ **EXECUTADO** (2026-06-15) — A0→A1→A2→A3 concluídos, 98 testes verdes, build OK, validação visual (Docker MCP) nos 3 estados. Registro em `docs/DECISIONS.md §5.4` (2026-06-15). · **Criado:** 2026-06-15 · **Revisado:** 2026-06-15 · **Modelo:** Option B (escrever → aprovar → executar, CLAUDE.md §5).
> Este documento foi a spec executada. Os 7 pontos de decisão foram todos decididos (ver fim do doc); a #4 foi diferida para Fase B na 2ª revisão.
>
> **Revisão (4 reparos incorporados, verificados contra o código):** (1) o escopo se avalia pela **composição**, não pelo `fiberType` (que é cego a poliéster/seda/linho) — A1.2/A1.3; (2) **regra explícita de blend** (corte ≥60% para in-scope) — A1.4 / decisão #6; (3) **não exibir `value` numérico** em abstenção — A1.9 / decisão #5; (4) **reconciliar banda × confidence na UI** (evitar "out-of-scope + verified" brigando) — A1.8 / decisão #7.
>
> **Segunda revisão (2 correções pós-auditoria de código, 2026-06-15):** (5) o corte de blend é sobre a **SOMA das fibras in-scope ≥ 60%**, não sobre uma fibra única ≥60% — senão um blend premium de duas in-scope (ex.: Norse Falster 50% algodão / 50% TENCEL, auditado A+) seria abstido por engano — A1.4 corrigido; (6) a **decisão #4 saiu da Fase A** (movida para Fase B): a premissa "selo Audited [tier]" não existe no código — `BrandMatch` (`types.ts:85-90`) não carrega `tier`, o match é por host (não por produto), e a UI (`ResultCard.tsx:211-223`) mostra um selo genérico "Audited" sem tier. Logo não há contradição visível a resolver hoje; exibir tier como veredito exige match por produto + `tier` no `BrandMatch` = trabalho de Fase B.
>
> **Decisões do dono (2026-06-15):** todos os 7 pontos confirmados. Destaque: banda nova `out-of-scope` (#1); adiar detecção de certs, só rebaixar `organic` (#2); modal/lyocell in-scope (#3); **#4 DIFERIDA para Fase B** (ver acima); não exibir número em abstenção (#5); corte de blend = **soma das in-scope ≥ 60%** (#6); confiança reformulada na UI em abstenção (#7).

## Objetivo

O app só pontua o que sabe pontuar de verdade (algodão / merino / TENCEL); para o resto ele **se abstém honestamente**. E sustentabilidade deixa de se disfarçar de qualidade. Tudo isso **sem quebrar a KB auditada** e com uma rede de regressão.

**Princípio condutor:** *estender reconhecimento, não competência*. A abstenção é o mecanismo que torna seguro adicionar tecidos depois (Fase E) — cada fibra que ganha critério real **sai** da lista de abstenção. Construir tecidos novos sem o abster-se primeiro seria erguer o segundo andar sem o primeiro.

## Por que esta é a prioridade máxima

Verificado no código: o poliéster é o **único** caso que mente com confiança. A penalidade `+15` (`lib/parser/evaluate.ts:119`) entra como "corroboração" (`evaluate.ts:134-147`) e força `band = "low"` (`evaluate.ts:155-159`), com `confidence: "verified"`. Seda / lã não-merino / linho caem em `indeterminate` por acaso. É o único lugar onde o app viola seu princípio fundador (nunca afirmar o que não sabe). A solução abaixo unifica Q1 (poliéster) e Q2 (demais fibras) num conserto só.

---

## A0 — Corpus de regressão (a rede; fazer ANTES de tocar no scorer)

Sem isto, A1/A2 são chute. Com isto, são auditoria.

1. Criar `lib/parser/__fixtures__/corpus/` com **30–50 textos reais** salvos (não fetch ao vivo — segue o padrão de fixtures de `app/api/analyze/route.test.ts`; mantém o CI determinístico). Cobertura por arquétipo:
   - **algodão premium:** Asket, SANVT, Buck Mason
   - **camisa de algodão:** ISTO., Norse Oxford
   - **orgânico / GOTS:** Maison Cornichon, Asphalte
   - **merino**, **TENCEL/Lyocell:** Norse Falster, Insider
   - **fora de escopo:** 100% poliéster, blend poli-dominante, **seda**, lã não-merino, linho, viscose
   - **bordas:** denim/jeans (categoria `unknown`), página sem GSM (Zara via reader), página ilegível (Hollister)
2. Teste de snapshot (`toMatchSnapshot` do vitest) que roda `parse()` sobre cada fixture e **congela a saída atual** (`ParseResult` completo), commitada.
3. **Entregável A0:** snapshot verde sobre o comportamento de hoje. Zero mudança de lógica. É a "foto do antes".

> **Regra de ouro da Fase A:** nenhuma mudança em A1/A2 é aceita por update cego de snapshot. Cada linha de diff é auditada à mão contra o corpus — com o mesmo rigor que demos à KB.

---

## A1 — Abstenção honesta para fibras fora de escopo

1. **Reconhecer antes de abster.** Adicionar `silk`/`seda`/`seide`/`soie` ao `FIBER_KEYWORDS` (`lib/parser/tokens.ts:11-24`). As demais (linho, lã, viscose, poliamida, cashmere, modal) já existem. Isto **não** adiciona pontuação — só permite ao app *saber* o que está recusando (e, na Fase C, medir a demanda).
2. **Fibra dominante — avaliar pela COMPOSIÇÃO, não pelo `fiberType`.** ⚠️ Crítico: `parse()` (`lib/parser/index.ts`) produz `composition` (lista de partes com `pct`) e `fiberType` como **dois sinais independentes**. O `detectFiberType` é **cego** a poliéster/seda/linho/viscose (só reconhece algodão-ish + merino + TENCEL — verificado em `tokens.ts:detectFiberType`). Portanto o escopo DEVE ser decidido a partir de `composition` (onde essas fibras aparecem com `pct`), **nunca** a partir de `fiberType` (que para uma peça de poliéster retorna `null` e faria a abstenção nunca disparar). Nova função em `tokens.ts`: maior `pct` da composição = fibra dominante; sem `pct` mas com fibra única na composição, usa essa; composição vazia → cai no `fiberType` (→ algodão-ish) e segue o caminho atual de "sem dados" (não é abstenção).
3. **Escopo de competência:** `IN_SCOPE = { algodão (todos os tipos), merino, tencel/lyocell, modal }`. *(Ponto de decisão #3.)* Nota: `modal` e `egyptian` já existem no enum `FiberType` (`types.ts`), mas o parser não os produz de uma página — então o teste de escopo via composição (passo 2) é o que efetivamente reconhece `modal` quando a marca o declara em "NN% modal".
4. **Blends — regra explícita (corrigida na 2ª revisão).** *(Ponto de decisão #6.)* O corte é sobre a **SOMA das fibras in-scope**, não sobre uma fibra única: a peça é IN_SCOPE se `Σ(pct das fibras in-scope) ≥ 60%`. Por quê: um blend de **duas** in-scope (ex.: 50% algodão + 50% TENCEL) tem soma 100% e deve pontuar normalmente — mas pela regra antiga de "fibra única ≥60%" seria abstido por engano (o caso real é o **Norse Falster, auditado A+**, no corpus do A0). Casos a cobrir:
   - `50% algodão / 50% poliéster` → soma in-scope 50% < 60% → `out-of-scope` ("blend misto");
   - `50% algodão / 50% TENCEL` → soma in-scope 100% → **IN_SCOPE** (pontua normal, `fiberType: TENCEL`);
   - `60% algodão / 40% poliéster` → soma in-scope 60% → IN_SCOPE (lembrando que `POLYESTER_WARN_PCT` é `> 40`, então 40% exato nem penaliza — e, de fato, um in-scope nunca terá poliéster > 40%, tornando o caminho de penalidade inalcançável);
   - sem `pct` na composição (só "100% cotton" sem número, ou fibra única): se a única fibra é in-scope → IN_SCOPE; se há fibra out-of-scope sem percentual → `out-of-scope`. Composição vazia (nenhuma fibra lida) → **não é abstenção**, cai no caminho atual de "sem dados" (`indeterminate`).
5. **Novo estado de banda.** *(Ponto de decisão #1, recomendado.)* Adicionar `"out-of-scope"` a `ScoreBand` (`lib/types.ts:45`). Distingue "não sei pela falta de dado" (`indeterminate`) de "tenho o dado, mas esta fibra está fora do meu critério". Alternativa: `indeterminate` + flag booleana — menos churn de tipo, pior para a mensagem ao usuário e para o analytics de demanda (Fase C).
6. **`scoreFabric` (`evaluate.ts:70`):** se a fibra dominante ∉ IN_SCOPE (ou blend sem in-scope ≥60%) → `band = "out-of-scope"`; **remover** o caminho `highPolyester → low` e tirar `highPolyester` de `hasCorroboration`. Poliéster alto deixa de forçar "low".
7. **Wrinkle fica como está** (`evaluate.ts:167-215`). O veredito de amassado é mais universal que a nota de qualidade — linho→high, poli≥50→low, malha→low continuam respondendo honestamente mesmo em abstenção.
8. **Confiança + reconciliação com a banda (cuidado de UI).** *(Ponto de decisão #7, novo.)* ⚠️ `confidence` é calculado **independente** da banda (verificado em `index.ts`: `confidenceLevel` só olha fiber/gsm/weave/construction lidos). Então uma peça `out-of-scope` ainda pode sair com `confidence: "verified"` — e a UI mostraria "out-of-scope" e "confidence: verified" lado a lado, o que lê como contradição ("vocês não avaliam, mas estão confiantes?"). Decisão: quando `band === "out-of-scope"`, a UI **suprime ou reformula** o rótulo de confiança (ex.: trocar por "fibra reconhecida, critério ainda não disponível"). A confiança interna (no contrato JSON) pode permanecer para analytics; o que muda é a exibição. Não deixar os dois rótulos brigando na tela.
9. **UI (`components/ResultCard.tsx`, mapas `BAND_TEXT`/`BAND_BAR`):** tratar `out-of-scope` com mensagem honesta ("ainda não avaliamos [fibra] — estamos trabalhando nisso"), nunca uma nota falsa. Cor neutra (cinza), sem barra de score, **sem `value` numérico exibido** (ver ponto de decisão #5).
10. **i18n:** nova chave `result.band.out-of-scope` (+ texto de explicação) nos 4 dicionários (`lib/i18n/dictionaries/*.ts`), mantendo a voz por idioma. Sem string hard-coded.
11. **Testes:** unit com texto sintético — 100% poliéster → `out-of-scope` (não `low`); 100% seda → `out-of-scope`; blend 50/50 algodão-poliéster → `out-of-scope`; **blend 50/50 algodão-TENCEL → IN_SCOPE (não out-of-scope!)**; blend 60/40 algodão-poliéster → IN_SCOPE (pontuado); merino → continua pontuado; algodão genérico premium → inalterado. Re-baseline do snapshot A0 (auditado linha a linha).

---

## A2 — Desacoplar orgânico/certificações da qualidade de fibra

1. `FIBER_QUALITY.organic`: **2 → 1** (`lib/knowledge/guide.ts:77`). Orgânico pode ser fibra curta upland; é agronomia/sustentabilidade, não comprimento de fibra.
2. `goodFiber` (`evaluate.ts:127-130`): **remover `organic`**; manter `long-staple` (comprimento de fibra é o driver real de qualidade) e os premium.
3. *(Ponto de decisão #2, opcional — recomendo adiar a detecção, fazer só o rebaixamento agora.)* **A2b:** detectar GOTS/OEKO-TEX/bluesign como eixo separado "eco/segurança", exibido com rótulo explícito de que **não** é qualidade. Exige campo novo em `types.ts` + i18n.
4. **Revalidação manual da KB (risco conhecido).** Após A2, rodar o corpus e, para cada marca auditada orgânica (Asket, ISTO., Maison Cornichon, Norse orgânico, Merz GOTS, SANVT, Insider, Asphalte), comparar a **banda computada** com o **tier editorial** de `lib/knowledge/brands.ts`. A KB não é recalculada (o `tier` é fixo). Registrar no corpus quais marcas mudaram de banda após o rebaixamento de `organic`. (Nota verificada: a **Asket não muda** — "100% organic long-staple" é detectado como `long-staple`, não `organic`, pela ordem das regex em `tokens.ts:121-124`.)
   - **Sobre a "contradição visível" (decisão #4 — DIFERIDA para Fase B):** a auditoria de código mostrou que ela **não existe hoje**. O `BrandMatch` (`types.ts:85-90`) não carrega `tier`; o match é por host (`brands.ts:39`), não por produto; e a UI (`ResultCard.tsx:211-223`) mostra um selo **genérico "Audited"** + nome da marca, **sem tier**. Logo, o que aparece é "Audited" + banda computada — coerente e honesto ("vetamos a marca; esta página parseia como medium"). Nada a fazer em A. **Na Fase A a banda computada permanece o veredito, inclusive em marca auditada.** Exibir o tier auditado como veredito de alta confiança (cedendo a banda) é uma feature da Fase B, pois exige `tier` no `BrandMatch` + match por produto (path da URL, não só host) — a mesma maquinaria da recomendação #6.

---

## A3 — Docs, testes e sincronização

- Atualizar: `docs/KNOWLEDGE-BASE.md §6` (postura sobre sintéticos: poli>40% = fora de critério, não alerta de qualidade), `docs/PARSER.md §5` (regra de abstenção; orgânico não é eixo de qualidade), `docs/SPEC.md §3` (novo estado no contrato), `docs/I18N.md` (chaves novas), `docs/DECISIONS.md §5.4` (registro datado da decisão).
- Atualizar os 67 testes; re-baseline dos snapshots como auditoria.
- **Validação final:** `pnpm lint && pnpm test && pnpm build` verdes; checagem manual no app rodando de 4 arquétipos: 100% poliéster, seda, algodão orgânico, e uma marca auditada (ex.: ISTO.).

---

## Fora do escopo da Fase A (explicitamente)

Critério de qualidade real para qualquer fibra não-algodão (denim por oz, lã por micron, seda por momme) → **Fase E**. Recomendações da KB (#6), fotos do produto (#5), banco/cache/analytics pesado → **Fases B/C**. **Exibir o tier auditado como veredito (ex-decisão #4): `tier` no `BrandMatch` + match por produto → Fase B.** Aqui só se constrói o *abster-se* e a rede de regressão.

## Pontos de decisão — TODOS DECIDIDOS PELO DONO (2026-06-15)

O Claude Code deve seguir estas decisões; não são mais abertas.

1. **Banda nova `out-of-scope`** — ✅ **DECIDIDO: criar a banda nova** (não usar `indeterminate` + flag).
2. **Detecção de certs (A2b)** — ✅ **DECIDIDO: adiar a detecção; fazer só o rebaixamento de `organic` agora.** A2b fica para fase futura.
3. **modal/lyocell dentro do escopo** — ✅ **DECIDIDO: sim, in-scope.**
4. **UI quando há `brandMatch` e a banda computada fica abaixo do tier editorial** — ⏭️ **DIFERIDA para Fase B** (auditoria de código, 2026-06-15). A premissa não existe no código: `BrandMatch` não tem `tier`, o match é por host (não por produto), e a UI mostra um selo genérico "Audited" sem tier — então não há contradição visível a resolver na Fase A. Exibir tier como veredito exige match por produto + `tier` no `BrandMatch` (Fase B). Na Fase A a banda computada segue sendo o veredito. Ver A2.4.
5. **`value` (0–100) em abstenção** — ✅ **DECIDIDO: NÃO exibir número** (idealmente nem calcular). `band`-only para `out-of-scope`.
6. **Corte de % para blend in-scope** — ✅ **DECIDIDO: ≥ 60%.** Abaixo do corte, `out-of-scope` "blend misto".
7. **Rótulo de confiança quando `band === "out-of-scope"`** — ✅ **DECIDIDO: suprimir/reformular na UI; manter no JSON para analytics.**

## Ordem de execução

**A0 → A1 → A2 → A3**, um commit atômico por sub-passo. A0 commitado e verde **antes** de qualquer mudança de lógica.
