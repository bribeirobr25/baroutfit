# Auditoria do diff — P2.4 Fase 1a (sob gate de diff, antes do commit)

> **Data:** 2026-06-17 · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** o diff da Fase 1a que o Claude Code executou e trouxe ao gate (5 arquivos, +150/−3, não commitado): `app/api/analyze/route.ts`, `lib/extract/index.ts`, `lib/parser/index.ts`, `lib/parser/parser.test.ts`, `lib/types.ts`.
> **Método:** leitura direta dos 5 arquivos. Cada condição do gate foi conferida contra o código real, não contra o relato do Claude Code.

---

## Veredito

**Aprovável para commit.** Todas as condições do gate que podem ser verificadas por leitura de código **passam**. O Claude Code respeitou o gate (trouxe o diff antes do commit) e foi honesto sobre um bug que o próprio check ao vivo pegou — e que está, de fato, corrigido no código. Os claims de runtime (162 testes verdes, leituras ao vivo, smoke) permanecem dele, não verificados aqui (ver fronteira).

---

## ✅ Condições do gate — verificadas no código

1. **Fallback byte-idêntico sem candidato (corpus diff = 0).** `chooseComposition` (`parser/index.ts`) retorna `{ composition: extractComposition(text) }` no caminho sem candidato — exatamente a chamada original. Os fixtures do corpus chamam `parse(text)` sem `candidates` ⇒ caem nesse ramo. Consistente com "corpus diff = 0 provado rodando".

2. **O bug confessado está corrigido no código.** `chooseComposition` faz `extractComposition(normalize(c.raw))` — normaliza o raw do candidato igual ao blob, com comentário explicando que `extractComposition` assume input normalizado. A correção é real, não só relatada. (Era o "source=undefined em páginas reais" que o check ao vivo pegou.)

3. **Precedência correta + `catalog` descartado.** `FIBER_SOURCE_RANK` ordena `structured → meta → visible-text → reader`; `.filter((c) => c.scope !== "catalog")` remove o vizinho **antes** de ordenar. Fixtures cobrem: structured vence meta; catalog (vizinho) é descartado.

4. **1a NÃO promove `embeddedJsonText` (o ponto crítico).** Em `extractText`, os `fiberCandidates` nascem só de: `jsonld` (`structured`/`product`), `metaRaw` (`meta`/`page`), `visibleRaw` (`visible-text`/`page`). O `embedded` **não** entra como candidato e **continua no array do blob `text`** (`[title, ogTitle, metaDesc, jsonld, embedded, ...containerParts]`), exatamente como antes. ⇒ "Gap/Armani seguem cobertas pelo fallback, zero regressão" é **verdade por construção**.

5. **Aditividade.** `FieldCandidate`, `FieldSource`, `FieldScope`, `Finding.source?` são novos/opcionais em `types.ts`; `route.ts` passa `candidates: fetched.extract.candidates` e adiciona o bloco `read` (P2.1) sem quebrar consumidores. `/share` e `/api/og` não leem nenhum dos dois (coerente com o relato grep-confirmado do Claude Code; não re-verifiquei esses dois arquivos neste turno).

6. **Acumulação no caminho reader correta.** `fetchPage` junta `directFiber` + candidatos do reader (`[...directFiber, ...reader]`), mantendo structured do direct no topo e reader como fallback. Coerente com A2 e com a precedência.

7. **Fixtures reproduce-first presentes.** `parser.test.ts` ganhou o bloco "P2.4 Fase 1a" com 5 casos: sem-candidato→blob/sem-source; grava source quando candidato rende; precedência structured vence meta; descarta catalog (vizinho); volta ao blob quando candidato não rende. Corretos e legíveis.

---

## 🔒 Fronteira de verificação (NÃO verificado aqui)
- **"162 testes verdes"** — não executo testes. Contei os 5 `it()` novos no `parser.test.ts` (existem e são corretos); o total e o "verde" são claim do Claude Code. (Por contagem estática anterior, o total bate na ordem de grandeza; loops dinâmicos do corpus/i18n expandem a contagem.)
- **Leituras ao vivo** (Norse visible-text/medium/37; Superdry reader/indeterminate/10) e **`pnpm smoke`** — reportadas, não re-verificadas neste turno.
- **`/share` e `/api/og` não lerem `candidates`/`source`** — aceito do grep do Claude Code; não reli os dois arquivos agora (baixo risco: campos opcionais).

---

## Recomendação ao dono
1. **Aprovar o commit da Fase 1a.** Todas as condições checáveis por código passam; a tese "zero regressão" é verdadeira por construção; o bug ao vivo foi corrigido. Commit-per-sub-passo, como combinado.
2. **Fase 1b permanece retida** para o seu próprio ciclo: construir o `scope` por produto do `embeddedJsonText` (casar handle/SKU + productId) com o fixture anti-vizinho obrigatório ("vizinho no mesmo `__NEXT_DATA__` NÃO vira candidato product").
3. Quando o Claude Code rodar a suíte para o commit, pedir a linha de sumário do `pnpm test` — fecha o único item de runtime em aberto (a contagem 162) de graça.

> **Resumo:** diff da Fase 1a verificado no código e aprovável para commit sob o gate. A peça crítica (1a não promove o JSON island; fallback byte-idêntico) confere. Claims de runtime seguem do Claude Code. Fase 1b retida.
