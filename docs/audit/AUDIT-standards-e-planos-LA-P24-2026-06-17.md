# Auditoria — STANDARDS.md + planos L-A e P2.4

> **Data:** 2026-06-17 · **Auditor:** revisor independente (chat), contra o código e os docs em disco.
> **Objeto:** os três documentos novos do Claude Code — `docs/STANDARDS.md`, `docs/plans/L-A-read-signal-na-decisao.md`, `docs/plans/P2.4-proveniencia-por-campo.md` — e o ponteiro adicionado em `CLAUDE.md §4`.
> **Método:** leitura direta dos três docs + `CLAUDE.md`; verificação cruzada das afirmações verificáveis contra o histórico do projeto e o código já auditado (`evaluate.ts`, `extract/index.ts`, `types.ts`, snapshot do corpus).

---

## Veredito resumido

Trabalho **muito bom**, e o `STANDARDS.md` é a peça de maior valor que o Claude Code produziu até aqui — consolida num só lugar o que viemos provando. **Aprovado com uma ressalva central de processo** (não de conteúdo): **L-A e P2.4 têm níveis de risco opostos e NÃO devem ser tratados como par.** L-A pode executar; **P2.4 fica retido para auditoria pré-execução** (mesmo gate da Fase A / mudanças de scorer). Verificações abaixo.

---

## ✅ Verificado (não inferido)

- **`CLAUDE.md §4` cita o `STANDARDS.md` com "Ler antes de planejar ou codar"** — confirmado em disco; é o 1º item da leitura obrigatória. A afirmação do Claude Code é verdadeira.
- **`STANDARDS.md` respeita a própria "regra de ouro"** (um princípio só fica se muda uma decisão real no código). Cada princípio A1–A10 cita onde foi *ganho*:
  - **A1** (nunca inventar, incl. quantidade) = o bug-classe absence→judgment que auditamos (poliéster→low, jersey-tee→low). Real.
  - **A2** (acumular, chokepoint único) = a lição Superdry generalizada (`AUDIT-licoes-sistemicas`). Real.
  - **A3** (escopo ao produto) = a regra anti-vizinho (L-B / `extractText` lendo só nós `Product`). Real.
  - **A4** (proveniência first-class) = L-C, exatamente o que o P2.4 vai consertar. Coerente.
  Nenhum princípio é "boa prática de blog" — tudo tem proveniência no projeto. É o que pedimos.
- **§4 "conscientemente diferido"** (event-driven, DDD tático, API versionada, recuperação distribuída) — registrar como **decisão com gatilho de revisão** é a parte mais madura: impede cargo-cult de volta. Endossado.

---

## ✅ Os planos — avaliação

### L-A (realimentar o sinal de read na decisão de path) — **liberado para executar**
- **Crédito:** ao escrever, o plano descobriu um escopo mais honesto — a fast-path já retorna em qualquer sinal de tecido, então o ganho real é o **PDP thin-mas-estruturado** (fibra+GSM em meta/JSON-LD) que hoje gasta ~18s no reader à toa. E separou a ideia (b) reconhecendo que **é source-merge → pertence ao P2.4**, não duplicada. Clareza que só aparece escrevendo com cuidado.
- **Risco:** baixo. Muda uma condição de gate de path, com reproduzir-antes e guardas anti-regressão explícitas (thin+completo→direct; thin+parcial→reader, preservado; não-thin→inalterado). A honestidade (A1) é mantida: governa o sinal real no texto.
- **Decisão #L-A-1:** fiber+gsm como "completo" — **concordo** (alinha ao `read.complete` do contrato; conservador).

### P2.4 (proveniência por campo) — **RETER para auditoria pré-execução**
- **Qualidade do plano:** alta. Migração campo-a-campo, corpus congelado como rede, blob como fallback, auditoria independente antes de enviar, reversível por campo. Bem desenhado.
- **Por que reter:** o próprio plano se declara "**a mais arriscada — mexe na junção extração→parser, território do princípio fundador**". Isso é exato. É mudança de **forma** do pipeline; se der errado, corrompe **silenciosamente** o que torna o app confiável. Merece o **mesmo gate que demos à Fase A e a cada mudança de scorer**: reproduzir-antes + uma auditoria independente contra o código **antes** do dono aprovar a execução — não só depois.
- **Não é um "não".** É "não no mesmo nível de confiança que o L-A". Detalhar → auditar → aprovar → executar.

---

## ⚠️ Ressalva central de processo

O Claude Code ofereceu: "executo o L-A primeiro, ou reviso os planos?". A resposta correta é que **os dois não são par**:
- **L-A:** pequeno, isolado, seguro → **executar** (com #L-A-1 = fiber+gsm).
- **P2.4:** muda o coração do pipeline → **reter** para o gate completo.

Tratar os dois como "qual primeiro" subestima a diferença de risco. Aprovar P2.4 na mesma velocidade do L-A seria abrir mão do gate que protegeu o scorer.

---

## 🟢 Decisões abertas — recomendações

**L-A**
- **#L-A-1** (completo = fiber+gsm): **confirmar** (recomendação do CC aceita).

**P2.4** (confirmar agora ajuda, mas a execução continua retida):
- **#P2.4-A** (qual campo primeiro = fiber): concordo — mais fontes, maior valor p/ UI.
- **#P2.4-B** (candidato `scope:catalog`): **descartar** — esta eu cravo com ênfase. Aceitar dado de catálogo, mesmo com confiança rebaixada, **reabre exatamente o risco-vizinho que o A3 existe para fechar**. "Mais honesto/seguro" é a escolha certa.
- **#P2.4-C** (granularidade de `source` = grossa): concordo.
- **#P2.4-D** (adapter "candidatos→findings" por cima do parser, **não** reescrever os extractores de token): **a mais importante das quatro.** Concordo com a recomendação do CC — é ela que torna a migração **reversível por campo**. Confirmar explicitamente.

---

## 🟡 Nota de manutenção (consciente)

O `STANDARDS.md` agora é uma fonte de verdade que **precisa ser mantida** — o próprio doc diz "padrão que não guia, apodrece". Se divergir do código no futuro, vira ruído. Não é problema agora; é um custo de manutenção assumido conscientemente. Vale revisitar o `STANDARDS.md` quando A2.4/P2.4/L-C mudarem a forma do pipeline, para os princípios continuarem mapeando decisões reais.

---

## 🔒 Fronteira de verificação

- **Verificado em disco:** os 3 docs existem e são coerentes; `CLAUDE.md §4` cita o STANDARDS; os princípios A1–A10 mapeiam auditorias/bugs reais do histórico.
- **NÃO verificado:** nada de runtime aqui (são docs/planos, sem código novo). Quando o L-A executar, auditar o diff contra o código (especialmente os 3 fixtures de `fetchPage`) e os números de teste.

---

## Recomendação ao dono (resumo)

1. **Liberar o L-A** para execução (com #L-A-1 = fiber+gsm), commit-per-sub-step, reproduzir-antes.
2. **Reter o P2.4** para uma rodada de auditoria independente contra o código **antes** de aprovar — mesmo gate da Fase A. Pré-confirmar as decisões #P2.4-A/B/C/D ajuda (em especial **B = descartar catalog** e **D = adapter, não rewrite**).
3. **Aprovar o `STANDARDS.md`** como base, ciente do custo de mantê-lo alinhado ao código.

> Resumo: STANDARDS sólido e bem-fundamentado (princípios ganhos, não inventados); L-A liberado; P2.4 bem-planejado mas retido para o gate completo por mexer no coração do pipeline. Sem claims de runtime nesta auditoria.
