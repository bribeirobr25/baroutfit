# Plano — Modelo de evidência no scorer (parar de transformar AUSÊNCIA em "low")

> **Status:** ✅ **EXECUTADO** (2026-06-16) — A0 (repros + guarda) → conserto em `evaluate.ts` (decisões #1/#2/#3) → re-baseline auditado → testes. 138 testes verdes, lint/build limpos, curl ao vivo (Hugo Boss → `indeterminate`). Visual Docker MCP pendente (servidor caiu na sessão). · **Criado:** 2026-06-16 · **Modelo:** Option B (CLAUDE.md §5).
> Origem: lições sistêmicas (`docs/audit/AUDIT-licoes-sistemicas-engine-2026-06-16.md`) + a previsão do auditor **reproduzida**: `Non-iron dress shirt. 100% cotton.` → `band: low, value: 10`. O conserto do jersey (Fase C anterior) **não** reparou o `value < 25`; só desviou um caso dele.

## A lição (raiz recorrente)
Quatro bugs aparentemente distintos — poliéster→low, orgânico inflando, tee jersey→low, premium auditado subavaliado — são **um só**: o motor não tem uma noção explícita de **três estados** (evidência positiva / evidência negativa / **ausência**), e a ausência escorrega para um polo. Consertamos caso a caso (abstenção, orgânico, jersey). Falta o conserto **sistêmico**: **`low` só pode vir de evidência NEGATIVA nomeada, nunca de um score baixo (= ausência de pontos).**

## Evidência atual do bug (medida, não suposta)
- **`noniron-generic-shirt-nogsm`** → `low`, value 10. `nonIron` entra em `hasCorroboration` (escapa do `indeterminate`), mas soma **0** ao value → `value < 25` dispara → **low falso**. (Fixture no corpus.)
- **A2.4 já mostrava o mesmo:** Kiton (A+) → `low(22)`, Luigi Borrelli, Pompeii, Dudalina — camisas de fibra genérica (não detectamos Giza), com sinal de construção (madrepérola) mas sem GSM → `value < 25` → low. **O motor vem chamando camisas napolitanas premium de "Mostly marketing".**

## Causa no código (`lib/parser/evaluate.ts`)
```
const hasCorroboration = d.gsm != null || informativeWeave || d.construction.length > 0 || d.nonIron || premiumSpin;
...
else if ((gsmQuality != null && gsmQuality <= 1 && !goodFiber) || value < 25) band = "low";
```
Dois defeitos: (1) `nonIron` corrobora mas não informa qualidade nem soma value; (2) `value < 25` produz "low" a partir de **ausência**, não de evidência negativa.

## A mudança (modelo de evidência)
1. **Corroboração = só o que informa qualidade E soma value:** GSM, weave informativo (≠ jersey), construção, fiação premium. **Remover `nonIron` de `hasCorroboration`** (é tratamento anti-amassado, 0 de value; generaliza a exclusão do jersey). O `wrinkleVerdict` **não muda** (non-iron segue → wrinkle low).
2. **`low` exige evidência NEGATIVA nomeada — remover o catch-all `value < 25`.** `low` = `(gsmQuality != null && gsmQuality <= 1 && !goodFiber)` (peso baixo declarado + fibra comum). (`highPolyester > 40` é inalcançável para in-scope após a abstenção; manter inócuo.) Sem evidência negativa → `medium` (corroborado) ou `indeterminate` (sem corroboração).
3. `value` (0–100) segue exibido como número; deixa de governar a banda — **banda vem de evidência, número é informativo** (espírito da auditoria).

## Efeito esperado (auditar à mão no re-baseline do corpus)
- `noniron-generic-shirt-nogsm` → **`indeterminate`** (nonIron não corrobora; sem GSM → "a etiqueta se cala"). ✅ conserto.
- Kiton-class (genérico + construção + sem GSM) → **`medium`** (corroborado por construção, sem evidência negativa) — não mais "low". E o bloco de **referência verificada (#4)** já mostra "nossa avaliação: topo de linha" para os auditados. ✅
- `light GSM generic tee` (130 g/m²) → **segue `low`** (peso baixo declarado = evidência negativa real). ✅ inalterado.
- Tees jersey sem GSM → seguem `indeterminate`. Bandas `high`/`medium`/`out-of-scope` inalteradas.

## A0 — reproduções + GUARDA antes de tocar o scorer (disciplina que de-riscou o jersey)
Adicionar ao corpus (e confirmar a banda HOJE) antes do conserto:
- **Repro do bug:** `noniron-generic-shirt-nogsm` (feito → `low`, value 10) + **um Kiton-class** (`Camicia. 100% cotton. Poplin. Mother-of-pearl buttons.` sem GSM) + **um genérico + 1 construção**. Devem computar `low` hoje; após o conserto → `indeterminate`/`medium`.
- **GUARDA contra over-correção (pedido da auditoria 2026-06-16):** `lightweight-generic-tee-140gsm` (feito → `low`, **value 27 ≥ 25**). Como o value é ≥ 25, o `low` vem do ramo de **evidência negativa** (`gsmQuality ≤ 1 && !goodFiber`), **não** do `value < 25`. Logo, ao remover o catch-all, **este caso DEVE permanecer `low`** — prova de que o conserto não transforma tecido genuinamente leve em "medium". O re-baseline tem de mantê-lo `low`.
Rodar o snapshot, ler banda/valor, consertar, reler — auditar cada diff à mão.

## Testes
Unit (`parser.test.ts`): non-iron genérico → `indeterminate` (não low); genérico + construção + sem GSM → `medium` (não low); `light GSM generic` → segue `low`; premium/high inalterados; jersey-sem-GSM segue `indeterminate`. Re-baseline do corpus auditado.

## Pontos de decisão
1. **#1 — Remover `nonIron` de `hasCorroboration`:** recomendo **sim** (não é evidência de qualidade; soma 0 de value).
2. **#2 — `low` só por evidência negativa (remover `value < 25`):** recomendo **sim** (é o conserto-raiz).
3. **#3 — Corroborado mas sem GSM e sem evidência negativa:** decidir no re-baseline conforme o corpus. Regra refinada (auditoria 2026-06-16): weave informativo → `medium`; **mas se a ÚNICA corroboração for 1 token de construção (ex.: um "mother-of-pearl") → `indeterminate`** (1 sinal fino não basta para "medium" num item sem GSM); nada → `indeterminate`. Erra-se para o lado honesto (não punir nem inflar a ausência).

## Fora de escopo (planos/itens separados — ver `ROADMAP-engine-licoes.md`)
- **Extração: source-merge + cobertura + confiança-no-read + proveniência** → **P2** (`P2-extracao-source-merge.md`).
- **Cache + analytics + corpus alimentado por páginas reais** → **P3 / Fase C** (consome o sinal de confiança do P2).
- **Cobertura de reconhecimento (Giza/egípcio/modal/multi-fibra)** → **P4 / Fase E** (resolve a subavaliação na origem, não só no scorer).
> Este é o **P1** do roadmap (camada ANALISAR) — independente de P2/P3/P4; pode executar primeiro.

## Ordem de execução (se aprovado), commits por sub-passo
A0 (reproduções Kiton-class + genérico-1-construção, confirmar `low`) → conserto (#1 + #2 em `evaluate.ts`) → re-baseline do corpus **auditado à mão** → testes unit → docs (PARSER §5, DECISIONS) → validação (`lint`/`test`/`build` + visual Docker MCP: camisa non-iron e uma Kiton-like não mais "low").
