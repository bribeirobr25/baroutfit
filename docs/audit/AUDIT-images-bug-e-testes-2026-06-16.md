# Auditoria — verificação ao vivo: contagem de testes + bug "imagens não aparecem"

> **Data:** 2026-06-16 · **Auditor:** revisor independente (chat).
> **Pedido:** (1) verificar de fato (não confiar) a contagem de testes "139" reportada pelo Claude Code; (2) investigar o bug relatado pelo dono: "as imagens não aparecem mais junto com os resultados na UI". Escrever o feedback completo no filesystem.
> **Método:** leitura direta do código (contrato, rota, extração, UI) + **verificação ao vivo em produção** (`https://baroutfit.vercel.app`) via browser, incl. testes diretos do proxy `/api/image` com URLs reais.

---

## PARTE 1 — Contagem de testes ("139")

**Não foi possível executar `pnpm test`** (não há ferramenta de shell/execução contra o filesystem do dono). Em vez de confiar no número, **contei os `it()` à mão** lendo os 9 arquivos de teste:

| Arquivo | `it()` |
|---|---|
| `lib/parser/parser.test.ts` | 38 |
| `lib/extract/extract.test.ts` | 24 |
| `lib/parser/corpus.test.ts` | 25 (1 por item de `CORPUS`) |
| `lib/knowledge/knowledge.test.ts` | 11 |
| `lib/knowledge/matchProduct.test.ts` | 7 |
| `lib/knowledge/recommend.test.ts` | 7 |
| `lib/i18n/i18n.test.ts` | ~7 (3 fixos + 1 loop sobre 4 locales) |
| `app/api/analyze/route.test.ts` | 4 |
| `app/api/image/route.test.ts` | 5 |
| **Total (contagem estática)** | **~128** |

**Conclusão honesta:** a contagem real está na **ordem de grandeza certa (~128), não fabricada**, mas **não bate exatamente** com "139", e **não foi confirmada por execução**. A diferença provável: os loops dinâmicos (corpus 1-por-fixture, i18n 1-por-locale) expandem em mais casos do que a contagem estática capta, ou há alguns que contei a menos. **"139 verdes" continua sendo um claim do Claude Code, não verificado independentemente** aqui. Não é um sinal de alarme; é uma imprecisão a registrar.

---

## PARTE 2 — Bug "as imagens não aparecem" (investigado AO VIVO)

### Resumo executivo (a diagnose mudou ao verificar ao vivo)
O meu palpite inicial, **só por leitura de código**, foi que o proxy `/api/image` provavelmente estava falhando. **A verificação ao vivo provou que esse palpite estava ERRADO.** O proxy está **saudável**. Registro a correção do meu próprio raciocínio, porque é exatamente o tipo de inferência que este projeto exige verificar.

### O que foi verificado AO VIVO (fatos, não inferência)

**O proxy `/api/image` FUNCIONA** — testado em produção com URLs reais:
- ✅ **Imagem real de produto Shopify** (a foto real da Norse: `cdn.shopify.com/.../N01-0679-0001-10.jpg`) → **renderizou** ("image 2400×3600"). Esta é exatamente a classe de URL que o extrator coleta.
- ✅ `httpbin.org/image/png` (200 direto) → renderizou.
- ✅ `httpbin.org/redirect-to → image` (1 hop) → renderizou.
- ✅ `picsum.photos/200/300` (múltiplos redirects a CDN) → renderizou.
- ❌ `upload.wikimedia.org/...png` → **502 "upstream error"**. Mas isto é **a política estrita de User-Agent da Wikimedia** (ela rejeita o UA `"Mozilla/5.0 BAROutfitImageProxy"`), **não** um bug do proxy para imagens de loja.
- ❌ URLs inventadas (404) → erro esperado.

**Conclusão da Parte 2A:** o proxy lida corretamente com imagens reais de CDN de loja, inclusive via redirect. **O proxy não é a causa do seu bug.**

### O código de exibição e o contrato estão corretos (verificado por leitura)
- `lib/types.ts`: `AnalyzeOk.images?: string[]` existe.
- `app/api/analyze/route.ts`: repassa `...(fetched.extract.images?.length ? { images } : {})` — correto.
- `components/Analyzer.tsx`: passa `state.data` inteiro para `<ResultCard>` — não perde nada.
- `components/ResultCard.tsx`: renderiza `data.images.slice(0,4)` via `/api/image?src=…` — correto, com `snap-x`, lazy-load, cap 4.

Ou seja: **a cadeia API → UI está íntegra**, e o proxy serve as imagens. Se as imagens não aparecem, a causa mais provável que resta é **`data.images` vir vazio na resposta de `/api/analyze`** para as páginas testadas — isto é, a **extração** não estar coletando URLs de imagem naquelas páginas.

### O que NÃO foi possível verificar (fronteira honesta)
- **O `/api/analyze` é POST-only** e as ferramentas de browser disponíveis nesta sessão **não têm click/type** — só `navigate`/`snapshot`/`screenshot`. Portanto **não consegui acionar o formulário ao vivo** nem capturar o JSON real de `/api/analyze` para uma página de loja. **Não posso afirmar** se `data.images` vem populado ou vazio para a página específica em que você viu as imagens sumirem.
- Sem esse passo, a causa raiz exata do *seu* sintoma (extração vazia? página específica? intermitência?) **fica não-confirmada**. Não vou especular além do verificado.

### Pistas fortes sobre a causa (baseadas em evidência, marcadas como hipótese)
1. **`og:image` é lido ANTES do strip** (`extractText`), e páginas Shopify (Norse, etc.) **sempre** têm `og:image`. Então essas deveriam retornar ≥1 imagem. Se a Norse não mostra imagem, algo mudou — vale checar o JSON real de `/api/analyze` para Norse.
2. A Norse serve a galeria via **srcset/JS**; os seletores de galeria do P2.2 podem não casar com a estrutura atual da Norse (o próprio plano notou Osklen/Esteem retornando 1). Mas isso afeta a *galeria extra*, não o `og:image` base.
3. **Hipótese a testar primeiro:** abrir o DevTools → Network na página onde as imagens somem, rodar a análise, e inspecionar a resposta de `/api/analyze`:
   - Se **`images` está ausente/vazio** → o bug é na **extração** (não no proxy nem na UI).
   - Se **`images` tem URLs** mas as `<img>` falham → reabrir o caso do proxy/CSP (improvável, dado que o proxy serve Shopify ao vivo).

### Recomendação de próximo passo (para o dono ou Claude Code)
1. **Capturar o JSON real de `/api/analyze`** para a página exata onde as imagens somem (DevTools Network, ou `curl -X POST .../api/analyze -d '{"url":"…"}'`). Esse único dado resolve a ambiguidade que eu não consegui fechar.
2. Se `images` vier vazio: a regressão está na **extração** — provavelmente o caso em que `fetchPage` cai no **reader** (`r.jina.ai`) e a imagem do `direct` não está sendo mesclada, OU a página é servida de tal forma que nem `og:image` é capturado. Reproduzir com um fixture de extração (a disciplina "reproduzir antes de consertar").
3. Se `images` vier populado: investigar CSP/`img-src` no `next.config.ts` para `/api/image` (embora o proxy sirva Shopify ao vivo, então improvável).

---

## Fronteira de verificação (resumo honesto)
- **Verificado ao vivo:** o proxy `/api/image` serve imagens reais de loja (Shopify), httpbin, picsum, incl. redirects. Página inicial carrega com 0 erros de console.
- **Verificado por leitura:** contrato, rota, `Analyzer`, `ResultCard` — cadeia de imagem íntegra.
- **NÃO verificado:** o JSON ao vivo de `/api/analyze` (endpoint POST; sem ferramenta de click/type para acionar o form). Logo, **a causa raiz exata do bug de imagens fica em aberto** — reduzida a "extração provavelmente retornando `images` vazio", mas não provada.
- **NÃO verificado:** "139 testes verdes" (sem runner); contagem estática dá ~128.

> **Resumo:** o proxy de imagem está saudável (provado ao vivo, contrariando meu palpite inicial de código) e o código de exibição está correto — então o bug "imagens não aparecem" aponta para a **extração retornando `images` vazio** na(s) página(s) testada(s), o que precisa de **um** dado para fechar: o JSON real de `/api/analyze` daquela página. Contagem de testes ~128 (estática), não os "139" reportados, e não executada. Claims de runtime do Claude Code permanecem dele, não desta auditoria — exceto os que verifiquei ao vivo e estão marcados acima.
