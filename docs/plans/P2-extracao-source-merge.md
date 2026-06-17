# Plano P2 — Extração: source-merge + cobertura + confiança-no-read + proveniência

> **Status:** EM EXECUÇÃO · **P2.2 (cobertura de imagem) ✅ feito** (2026-06-16) · P2.1/P2.4 a seguir, P2.3 diferido (#P2-B). · **Criado:** 2026-06-16 · **Modelo:** Option B · Parte do `ROADMAP-engine-licoes.md` (camada COLETAR).
> **P2.2 executado:** galeria `<img>` (containers de produto/galeria, antes do `$("a").remove()`, conservador — exclui related/nav) + imagem markdown do reader (janela focada, cap 3). 139 testes (+1 unit galeria), lint/build limpos. Live: Zalando 1→5, North Face 1→5, Superdry 5; Osklen/Esteem seguem 1 (galeria não casou os seletores conservadores — trade-off seguro). Visual Docker MCP pendente (servidor caiu na sessão).
> A "lição Superdry" generalizada para TODA a coleta — os buckets do dono **sem material** (Zara, Gap, Armani, Tommy, Lacoste, Adidas, Ralph Lauren…) e **sem imagem** (Superdry, Osklen, Zalando…), e a **não-determinância** (bucket bloqueados).
> Princípio fundador preservado: só expõe o que está **literalmente** no payload; guardas anti-vizinho mantidas.

## Visão (princípio #2 do roadmap: acumular, não substituir)
Hoje a extração mistura tudo num único `text` e o parser re-extrai por regex; `fetchPage` escolhe **um** path (direto OU reader) e descarta o resto (Superdry: reader jogou fora a `og:image` do direto — já mitigado pontualmente). A visão: **cada read acumula sinais de todas as fontes/paths, com proveniência por campo, e sabe quão completo ficou.** P2 caminha para isso em **sub-passos modulares** (do menor risco/maior valor ao maior), sem um rewrite arriscado de uma vez.

## Sub-passos (modulares — cada um entrega valor isolado)

### P2.1 — Confiança no read + retry (confiabilidade) · baixo-médio risco
- **Sinal de completude do read:** o que a leitura obteve — composição? imagem? GSM? specs? — e qual path (direto/reader). Expor no contrato (ex.: `read: { complete: boolean, via: "direct"|"reader", got: ["fiber","image",...] }`). Consumido por P5 (mostrar "leitura parcial") e P3/Fase C (cachear só reads bons).
- **Retry intermitente:** bloqueio/anti-bot é não-determinístico (eu li Hollister, dono não). 1 retry do path que falhou **dentro do teto** (`maxDuration=30`: direto ~9s + reader ~18s já somam 27s → retry só cabe no path rápido OU substituindo, não somando). *(Ponto de decisão #P2-A: orçamento do retry.)*
- Honestidade: read incompleto → `confidence` segue caindo; nunca completar lacuna.

### P2.2 — Cobertura de imagem extra (bucket "sem imagem") · baixo risco
- `<img>` de galeria: coletar `src`/`srcset`/`data-src` **antes** do strip (o `$("a").remove()` apaga galerias dentro de `<a>`), **só de containers de produto/galeria** (`[class*="gallery" i]`, `[class*="product-image" i]`, `[class*="product-media" i]`) — conservador p/ não pegar logo/thumb/related. Passar cada um por `resolveImage` (absolutiza, rejeita não-http/`data:`/SVG), dedupe, no cap existente.
- Imagem markdown do reader (`![..](url)`) quando o read veio do reader e não há imagem do direto.

### P2.3 — Cobertura de material extra (bucket "sem material") · médio risco
- Hoje lemos JSON-LD `Product` + `<script type="application/json">`/`__NEXT_DATA__` por chave-alvo. Estender (best-effort, **conservador anti-vizinho**) a state blobs inline não-JSON-puro (`window.__NUXT__=`, `__INITIAL_STATE__`) via regex de pares `"chave-material":"valor"` no texto do script — **com cap e dedupe**, e a guarda: a página colada é um PDP (1 produto dominante), então pares de material costumam ser do produto atual; manter o dedup + rejeição-de-prosa do parser. *(Ponto de decisão #P2-B: incluir state-blob inline agora vs. adiar p/ headless.)*
- O que **continua fora** sem headless: specs carregadas por XHR após interação (acordeão que chama API). Honestamente `partial`/`indeterminate` (e o sinal P2.1 dirá "leitura parcial").

### P2.4 — Proveniência por campo (habilita P5) · maior, mais cuidadoso
- Para os campos-chave (composição, GSM, weave, imagem): tentar as fontes **estruturadas primeiro** (JSON-LD → JSON embutido) e **registrar a fonte** do valor usado (`structured` | `visible-text` | `reader` | `meta`), em vez de só jogar no blob. Carregar a proveniência no contrato (`findings.*.source`).
- **Não** é um rewrite total do parser: mantém o fallback de blob; só dá precedência + tag às fontes estruturadas para os campos-chave. Risco de regressão controlado por: corpus congelado + auditoria manual do diff.
- *(Ponto de decisão #P2-C: granularidade — proveniência grossa (estruturado×texto×reader) **(recomendado)** vs. fina por fonte exata.)*

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
- **#P2-B — state-blob inline (`__NUXT__`):** recomendação refinada (auditoria 2026-06-16) — **adiar para o headless POR PADRÃO** (é o sub-passo onde a fibra de um vizinho mais pode vazar sob alta confiança). Só fazer o regex-em-blob agora se os dados mostrarem que o bucket "sem material" é **dominado por sites `__NUXT__`** especificamente. Não pagar o risco antes de a demanda justificar.
- **#P2-C — granularidade da proveniência:** grossa (recomendado) vs. fina.

## Fora de escopo
Scorer (P1, plano próprio); cache/analytics/corpus-real (P3/Fase C — **consome** o sinal de P2.1); reconhecimento Giza/modal/multi-fibra (P4/Fase E); headless/residencial (depois de P2/P3).
