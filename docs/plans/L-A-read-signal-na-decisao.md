# Plano L-A — Realimentar o sinal de read na decisão de path

> **Status:** ✅ **EXECUTADO (2026-06-17)** — auditado→liberado, depois implementado. `hasFabricSignal` dividido em `hasFiberSignal`/`hasGsmSignal` (GSM exige dígito); gate do `fetchPage` mantém read direto thin-mas-completo (fiber+gsm), pulando o reader; thin-parcial e não-thin **inalterados**. **157 testes** (+ unit dos 2 sinais + 2 testes de path reproduzir-antes), lint/build limpos, regressão ao vivo OK (Norse `direct`/1, Superdry `reader`/5 — inalterados). Não-commitado. · **Modelo:** Option B. · Origem: `ROADMAP §7/L-A` + follow-up do `P2.1`.
> **Princípios (STANDARDS):** **A2** (usar o sinal num único ponto, não recomputar), **A7** (degradação/eficiência proporcional), **A10** (cabe em `maxDuration=30`; evitar os 18s do reader sem necessidade), **A1** (honestidade do `complete`).

## O problema (medido)
`fetchPage` decide o path **antes** de qualquer parse; o `read.complete` (fiber+gsm) é derivado **na rota, depois**. Hoje a fast-path é:
```ts
if (direct.ok && !direct.extract.thin && hasFabricSignal(direct.extract.text)) return direct;
```
O `!thin` é o problema: um PDP **legitimamente curto** (pouca prosa visível, mas composição+GSM em `<meta>`/JSON-LD) tem `thin=true` → **cai no reader (≈18s)** mesmo **já tendo os fatos**. Desperdício de latência (e de cota), sem ganho — o reader não traria nada que a meta/JSON-LD já não deu.

## Escopo — só a parte pequena e segura (a grande é P2.4)
L-A tinha duas ideias; elas têm **tamanhos diferentes**:

- **(a) Pular o reader quando o read direto já está completo** — mesmo `thin`. **PEQUENO, seguro, puro na decisão de path.** ✅ **Este plano.**
- **(b) Enriquecer um read direto parcial indo ao reader e mesclando FATOS por campo** (ex.: tem fibra, falta GSM → buscar GSM no reader e unir). **MAIOR** — é source-merge por campo, ou seja, **é P2.4** (A2/A4). ➡️ **Diferido para P2.4**, não duplicar aqui.

## A mudança (a) — gate de path consciente de completude
Distinguir os dois sinais que compõem o `complete` **a partir do texto** (sem parser completo):
- `hasFiberSignal(text)` — `%` ou fibra nomeada (cotton/algod/wool/linen/tencel…).
- `hasGsmSignal(text)` — `gsm` / `g/m²` / `oz` / peso numérico.

(Refatorar o atual `FABRIC_SIGNAL_RE`/`hasFabricSignal` nesses dois, mantendo `hasFabricSignal = fiber || gsm` para não quebrar chamadas existentes.)

Novo gate em `fetchPage`:
```ts
const usable = direct.ok && (
  !direct.extract.thin
    ? hasFabricSignal(direct.extract.text)                 // comportamento atual preservado
    : hasFiberSignal(direct.extract.text) && hasGsmSignal(direct.extract.text) // thin só passa se COMPLETO
);
if (usable) return direct;
```
- **Não-thin:** inalterado (qualquer sinal de tecido → retorna direct). Zero regressão.
- **Thin + completo (fiber+gsm):** agora **retorna direct**, pulando o reader (ganha ~18s). 
- **Thin + parcial (só fiber, ou só gsm) ou sem sinal:** segue para o reader, como hoje.

Honestidade (A1): o que governa é o sinal real no texto; nunca assumimos GSM que não está lá. `confidence`/`read.complete` seguem refletindo o que veio.

## Reproduzir antes (A-workflow)
Fixture de `fetchPage` (mock de `fetch`):
- **Repro:** página `thin` (corpo curto) com `og`/JSON-LD trazendo `100% cotton` **e** `220 GSM` → HOJE vai ao reader (assert: `r.jina.ai` chamado). Após o fix → `via:"direct"`, **reader NÃO chamado** (assert nº de chamadas / nenhuma a `r.jina.ai`).
- **Guarda anti-regressão:** página `thin` com **só** fibra (sem GSM) → **continua** indo ao reader (comportamento preservado).
- **Guarda:** página não-thin com sinal → segue `direct` (inalterado).

## Riscos
- **Perder "extras" do reader numa página thin-mas-completa:** aceitável — temos os 2 fatos-âncora; trade-off explícito de latência×completude-de-extras. `confidence` continua honesto.
- **Falsos `hasGsmSignal`:** regex conservadora (exigir dígito perto de gsm/g/m²/oz) para não tratar prosa como GSM.

## Testes / validação
- Unit (`extract.test.ts`): os 3 casos acima + unit de `hasFiberSignal`/`hasGsmSignal`.
- `pnpm test` + `lint` + `build`; curl ao vivo (achar um PDP thin-mas-estruturado; senão validar pelos fixtures); `pnpm smoke` pós-deploy.

## Fora de escopo
- Enriquecimento por campo (b) → **P2.4**.
- Mudar o que é `complete` no contrato (segue fiber+gsm).

## Pontos de decisão
- **#L-A-1 — limiar de "completo para pular reader":** ✅ **CONFIRMADO `fiber+gsm`** (recomendação do CC, endossada pela auditoria) — alinhado ao `read.complete` do contrato; conservador (só pula o reader com as duas âncoras).
