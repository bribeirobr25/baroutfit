# Nota de fechamento — L-A concluído · P2.4 Fase 1a liberada sob gate de diff · 1b retida

> **Data:** 2026-06-17 (fecha a linha iniciada em `AUDIT-standards-e-planos-LA-P24-2026-06-17.md` e `AUDIT-LA-vivo-e-P24-fase1-2026-06-17.md`) · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** a correção 1a/1b que o Claude Code aplicou ao `docs/plans/P2.4-proveniencia-por-campo.md` em resposta à adenda.
> **Método:** releitura do plano P2.4 corrigido + verificação cruzada contra o código já lido nesta sessão (`extract/index.ts`, `parser/index.ts`, `tokens.ts`).

---

## Veredito

A correção do Claude Code é **fiel e completa**, e a afirmação factual nova ("1a deixa o `embeddedJsonText` alimentando o blob, zero regressão") é **verdadeira por construção** — verificada contra o código. O Claude Code **manteve o gate fechado** (status segue 🔒, ele mesmo disse que "afiou o plano mas não destravou a execução"). Comportamento correto.

**Decisão registrada:** a **Fase 1a é LIBERADA para execução sob gate de diff** (o Claude Code escreve, traz o diff + output do corpus + fixtures, e a verificação final acontece sobre o diff antes do commit). A **Fase 1b permanece RETIDA** para um ciclo próprio.

---

## ✅ Verificado no plano corrigido (não inferido)

1. **A divisão 1a/1b endereça exatamente o achado da adenda.** A 1a começa só por `jsonLdNodes`, que no código lê **apenas nós `Product`** via `isProductType` — então rotular como `scope:"product"` é rotulagem genuína (o escopo já existe), não capacidade inventada. Correto.

2. **"Zero regressão" é verdade por construção.** O plano diz que em 1a o `embeddedJsonText` **continua alimentando o blob `text` exatamente como hoje** e só não é promovido a candidato. Isso fecha com o adaptador (passo 3): sem candidato para um campo, `findings.fiber` cai no fallback **byte-idêntico** à linha atual. Como o JSON island segue entrando no `text` pelo mesmo caminho de hoje, o blob permanece intacto → Gap/Armani seguem cobertas pelo fallback. A lógica é consistente; a alegação é honesta.

3. **A capacidade nova foi corretamente empurrada para 1b**, marcada como "trabalho, não rótulo", com o **fixture anti-vizinho obrigatório** ("vizinho no mesmo `__NEXT_DATA__` NÃO vira candidato product"). É o que a adenda pediu.

4. **Os dois riscos remanescentes viraram itens de checklist do auditor**, com a redação certa: precedência (`meta`/`page` não vence `structured+product`) e — importante — "**PROVAR rodando o snapshot, não declarar**". A objeção metodológica virou exigência explícita do gate.

---

## O que falta para fechar o gate formal (só verificável sobre o código da 1a)

A maior parte da auditoria pré-execução já foi feita nos turnos anteriores (tese do adaptador verificada; buraco do escopo encontrado e corrigido). O que **resta** só pode ser verificado quando o código da 1a existir:

- [ ] **Corpus diff = 0 sem candidato** — provar **rodando** o snapshot (não declarar). *(O auditor-chat não executa testes; isto é verificado sobre o diff do Claude Code.)*
- [ ] **Precedência** — um candidato `meta`/`page` não vence onde havia `structured+product`. Testar explicitamente no código escrito.
- [ ] **Aditividade** — `ExtractResult.candidates` e `Finding.source` não quebram `/share`, `/api/og`, route.
- [ ] **1a NÃO promove `embeddedJsonText`** a candidato `product` (segue no blob, intacto).

---

## Decisão ao dono (resumo)

1. **L-A:** concluído e verificado no código. Encerrado.
2. **P2.4 Fase 1a:** **liberada para o Claude Code executar**, com a condição de trazer **o diff + o output do snapshot do corpus + o resultado dos 4 fixtures ANTES de propor o commit** — para auditoria sobre o diff, como em todos os gates. Commit-per-sub-passo.
3. **P2.4 Fase 1b** (construir o escopo por produto do JSON island, handle/SKU + fixture anti-vizinho): **permanece retida** para um ciclo próprio, só depois de 1a no ar e estável.

---

## 🔒 Fronteira de verificação

- **Verificado em disco:** a correção 1a/1b no plano; a coerência da tese "zero regressão" com o adaptador byte-idêntico; `jsonLdNodes` lê só nós `Product` (escopo genuíno em 1a).
- **NÃO verificado (claims do Claude Code, e a verificar sobre o diff da 1a):** smoke/deploy do L-A; "109 testes"; corpus diff=0; precedência. Esses fecham quando o código da 1a vier ao gate.

> **Resumo:** linha L-A/P2.4 fechada neste ponto. L-A concluído. A arquitetura do P2.4 está sólida e a correção 1a/1b resolveu o único bloqueio real (o `scope` por produto inexistente). Fase 1a liberada sob gate de diff; Fase 1b retida. Claims de runtime seguem do Claude Code, a confirmar sobre o diff.
