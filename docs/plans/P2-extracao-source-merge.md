# Plano P2 — Extração: source-merge + cobertura + confiança-no-read + proveniência

> **Status:** EM EXECUÇÃO · **P2.2 ✅** (imagem, 2026-06-16) · **P2.1 ✅** (read-confidence + retry, 2026-06-17) · **P2.3 ✅ subconjunto seguro** (spec-row em JSON island, 2026-06-17; `__NUXT__` segue por escopo — #P2-B/§7-L-B) · **P2.4 pendente** (reformulado como mudança de pipeline — §7/L-C). · **Criado:** 2026-06-16 · **Modelo:** Option B · Parte do `ROADMAP-engine-licoes.md` (camada COLETAR).
> **P2.2 executado:** galeria `<img>` (containers de produto/galeria, antes do `$("a").remove()`, conservador — exclui related/nav) + imagem markdown do reader (janela focada, cap 3). 139 testes (+1 unit galeria), lint/build limpos. Live: Zalando 1→5, North Face 1→5, Superdry 5; Osklen/Esteem seguem 1 (galeria não casou os seletores conservadores — trade-off seguro). Visual Docker MCP pendente (servidor caiu na sessão).
> A "lição Superdry" generalizada para TODA a coleta — os buckets do dono **sem material** (Zara, Gap, Armani, Tommy, Lacoste, Adidas, Ralph Lauren…) e **sem imagem** (Superdry, Osklen, Zalando…), e a **não-determinância** (bucket bloqueados).
> Princípio fundador preservado: só expõe o que está **literalmente** no payload; guardas anti-vizinho mantidas.

## Visão (princípio #2 do roadmap: acumular, não substituir)
Hoje a extração mistura tudo num único `text` e o parser re-extrai por regex; `fetchPage` escolhe **um** path (direto OU reader) e descarta o resto (Superdry: reader jogou fora a `og:image` do direto — já mitigado pontualmente). A visão: **cada read acumula sinais de todas as fontes/paths, com proveniência por campo, e sabe quão completo ficou.** P2 caminha para isso em **sub-passos modulares** (do menor risco/maior valor ao maior), sem um rewrite arriscado de uma vez.

## Sub-passos (modulares — cada um entrega valor isolado)

### P2.1 — Confiança no read + retry (confiabilidade) · baixo-médio risco · ✅ **EXECUTADO (2026-06-17)**
- **Sinal de completude do read:** ✅ contrato carrega `read: { via: "direct"|"reader", got: ⊂{fiber,gsm,weave,image}, complete }` (`complete` = fiber+gsm). Consumido por P5 (leitura parcial) e, no futuro, P3 (cachear só reads bons).
- **Retry intermitente:** ✅ (#P2-A resolvido) 1 retry do **direct** só em falha **transitória** (5xx/blip de rede) — nunca em timeout (orçamento gasto) nem 4xx (definitivo); transitórias retornam rápido, então cabe em `maxDuration=30`.
- Honestidade: read incompleto → `confidence` segue caindo; nunca completar lacuna.
- **Follow-up (§7/L-A — pendente):** hoje o sinal é só **reportado** (na rota, depois de o path já ter sido escolhido). Realimentá-lo **na decisão**: pular o reader quando o read direto já está `complete`; ir ao reader para **enriquecer** um read direto parcial (ex.: tem fibra, falta GSM). Pequeno, alto valor.

### P2.2 — Cobertura de imagem extra (bucket "sem imagem") · baixo risco
- `<img>` de galeria: coletar `src`/`srcset`/`data-src` **antes** do strip (o `$("a").remove()` apaga galerias dentro de `<a>`), **só de containers de produto/galeria** (`[class*="gallery" i]`, `[class*="product-image" i]`, `[class*="product-media" i]`) — conservador p/ não pegar logo/thumb/related. Passar cada um por `resolveImage` (absolutiza, rejeita não-http/`data:`/SVG), dedupe, no cap existente.
- Imagem markdown do reader (`![..](url)`) quando o read veio do reader e não há imagem do direto.

### P2.3 — Cobertura de material extra (bucket "sem material") · médio risco
- Hoje lemos JSON-LD `Product` + `<script type="application/json">`/`__NEXT_DATA__` por chave-alvo. Estender (best-effort, **conservador anti-vizinho**) a state blobs inline não-JSON-puro (`window.__NUXT__=`, `__INITIAL_STATE__`) via regex de pares `"chave-material":"valor"` no texto do script — **com cap e dedupe**, e a guarda: a página colada é um PDP (1 produto dominante), então pares de material costumam ser do produto atual; manter o dedup + rejeição-de-prosa do parser. *(Ponto de decisão #P2-B: incluir state-blob inline agora vs. adiar p/ headless.)*
- O que **continua fora** sem headless: specs carregadas por XHR após interação (acordeão que chama API). Honestamente `partial`/`indeterminate` (e o sinal P2.1 dirá "leitura parcial").

### P2.4 — Proveniência por campo = mudança de FORMA do pipeline (habilita P5) · maior, mais cuidadoso
> **Reformulado pelo roadmap §7/L-C (2026-06-17).** Era "rotular o que já existe"; na verdade é uma mudança de forma. **Causa-raiz:** `extractText` devolve um único `text` concatenado e o parser re-regexa esse blob → quando a análise roda, **a fonte de cada dado já se perdeu**. Por isso proveniência/“mostrar com precisão” seguem difíceis e a gente conserta sintoma a sintoma.
- **A mudança:** o extrator deixa de emitir só `text` e passa a emitir **candidatos estruturados por campo** — `{ value, source: structured|meta|visible-text|reader, scope: product|page|catalog }` — para composição, GSM, weave, imagem. O parser **consome candidatos** (precedência: estruturado+product-scope → meta → texto → reader), em vez de re-extrair de um blob. Carrega a proveniência no contrato (`findings.*.source`).
- **`scope` vem do §7/L-B:** cada candidato sabe se veio de um nó escopado ao produto (JSON-LD `Product`, ou JSON island casado por handle/SKU) ou de algo catálogo-inteiro — o que governa a confiança e fecha o risco-vizinho na origem (não por heurística de prosa).
- **Migração incremental, não big-bang:** manter o caminho de blob como fallback enquanto os campos-chave migram um a um; corpus congelado + auditoria manual do diff a cada campo.
- *(Ponto de decisão #P2-C: granularidade da `source` — grossa (estruturado×texto×reader) **(recomendado)** vs. fina por fonte exata.)*

## Riscos e mitigações
- **Vizinho (P2.3):** chave-alvo + cap/dedup + guarda de prosa + foco do reader (`focusReaderText`). Conservador por padrão.
- **Banda de imagem (P2.2):** o `/api/image` já tem rate-limit (L1) + cap N na UI; galeria-img é só extração.
- **Regressão (P2.4):** corpus + auditoria de diff; manter fallback de blob.
- **Tempo (P2.1):** retry dentro de `maxDuration=30`.

## Testes / validação
- Unit (`extract.test.ts`): sinal de read-confidence (got/via/complete); gallery-img coletado de container de produto e não de nav/related; markdown-image do reader; state-blob inline → composição por chave-alvo, **sem** vizinho; proveniência por campo (estruturado vs texto).
- Re-rodar os fixtures de bucket (estilo Gap/Armani material; Superdry/Osklen imagem) — confirmar melhora.
- Visual (Docker MCP): galeria com imagem recuperada via P2.2; "leitura parcial" honesta na UI (com P5).

## Ordem dentro do P2 (commits por sub-passo)
P2.2 (imagem, menor risco) → P2.1 (read-confidence + retry) → P2.3 (material extra, conservador) → P2.4 (proveniência). Cada um isolado e auditável; pode-se parar após qualquer sub-passo.

## Pontos de decisão
- **#P2-A — orçamento do retry** (cabe em `maxDuration=30`): retry só no path rápido / substitui em vez de somar.
- **#P2-B — state-blob inline (`__NUXT__`):** **reformulado pelo §7/L-B (2026-06-17): a fronteira é ESCOPO, não técnica.** O `__NUXT__` não é arriscado por ser regex/blob — é arriscado por ser **catálogo-inteiro** (carrega vizinhos), enquanto o JSON-LD é seguro por ser escopado ao nó `Product`. Então a decisão deixa de ser "regex-em-blob: sim/não" e passa a **"escopar a fonte ao produto exibido"** (casar o nó por handle/SKU/productID da URL). Com escopo, o `__NUXT__` vira seguro de minerar — e isso é exatamente o que P2.4 (candidatos com `scope`) entrega. Sem escopo, segue adiado. *(Substitui a regra anterior de "adiar por padrão até dados mostrarem domínio de `__NUXT__`".)*
- **#P2-C — granularidade da proveniência:** grossa (recomendado) vs. fina.

## Fora de escopo
Scorer (P1, plano próprio); cache/analytics/corpus-real (P3/Fase C — **consome** o sinal de P2.1); reconhecimento Giza/modal/multi-fibra (P4/Fase E); headless/residencial (depois de P2/P3).
