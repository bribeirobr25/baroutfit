# Plano — Robustez de extração (imagens + JSON embutido) + refino de score + galeria

> **Nota (2026-06-17):** registro de **execução** do primeiro passo de extração/galeria (C/A/B/L1–L3, o trabalho `image`→`images[]` ainda **não-commitado** — ver §6/M1 do roadmap). Planejamento **adiante** da coleta vive em `ROADMAP-engine-licoes.md` (§3 P2) + `P2-extracao-source-merge.md`. Mantido como trilha de auditoria, não como plano vivo.

> **Status:** ✅ **EXECUTADO** (2026-06-16) — C, A (imagens multi + caminho reader), B (JSON embutido), galeria UI, L1 (rate-limit `/api/image`), L2 (migração `image`→`images`), L3 (resolveImage por candidato). 130 testes verdes, lint/build limpos, data-path confirmado por curl (Superdry 0→5 imagens; band fix preservado). **Pixel-visual da galeria pendente** (Docker MCP instável na sessão) — confirmar render antes de deploy. · **Criado:** 2026-06-16 · **Modelo:** Option B (CLAUDE.md §5).
> Origem: testes do dono contra ~35 URLs reais. Diagnóstico em disco (curl do HTML cru) confirmou as causas. **Falhas de anti-bot/proxy são não-determinísticas** (dependem de IP/tempo) — fora do escopo (Fase E: headless/proxy residencial). Aqui atacamos o que é **reprodutível e barato** (free-tier).
>
> **Revisão pós-auditoria (`docs/audit/AUDIT-extracao-robustez-galeria-2026-06-16.md`):**
> - **Passo C — concordo com o MÉTODO (reproduzir antes de mexer) e EXECUTEI.** Adicionei ao corpus 2 fixtures que reproduzem o "low" (`hugoboss-jersey-tee`, `generic-jersey-tee-nogsm` → ambos `low`, value 22). Isso **confirma** a tese do jersey (a auditoria a achou "não reproduzida" no baseline antigo, o que era verdade — mas a causa é o `jersey` mesmo: 12 pts de weave + 10 de fibra genérica = 22 < 25). Apliquei o conserto (excluir `jersey` de `hasCorroboration`); os 2 fixtures viraram `indeterminate` e **nada mais mudou** — confirmando que a preocupação da auditoria com `cotton-elastane-tee` era um lapso (esse fixture tem GSM 200, corrobora por GSM, inalterado). Validado: 123 testes, curl ao vivo (Hugo Boss → `indeterminate`) e visual (Docker MCP).
> - **L1/L2/L3 (lacunas de spec de A/B) — aceitas e baked-in abaixo.**

## Causas confirmadas (diagnóstico em disco)
- **Imagem perdida no caminho reader:** Superdry **tem `og:image`**, mas o app devolveu sem imagem — porque a composição é via JS → caímos no reader-proxy, e **o caminho reader não captura imagem alguma**. (`fetchPage` descarta o `extract` do fetch direto ao usar o reader — `lib/extract/index.ts:539-541`.)
- **Composição em JSON embutido não lida:** Gap (inline) e Armani (`__NUXT__`) **têm a composição no HTML**, mas só lemos campos de `Product` JSON-LD + texto visível → devolvemos `null`.
- **Tee de algodão simples vira "low":** Hugo Boss / Neverless / Osklen / Gap leem **"low" / "Mostly marketing"**. Causa: `jersey` (a malha **padrão** de toda camiseta) entra como "corroboração" e destrava a banda; com `value < 25` → "low". Não há evidência **negativa** — só ausência de GSM. É subavaliação (mesma família do problema que corrigimos para marcas auditadas).

---

## A. Imagens — extração ampla + caminho reader + galeria

### A1. Extrair MÚLTIPLAS imagens (contrato `images: string[]`)
- `jsonLdNodes` já coleta um array `images` internamente, mas só devolve `images[0]`. Passar a devolver o array (a `image` do Product JSON-LD costuma ser a **galeria inteira**).
- Ampliar as fontes em `extractText` (em ordem de prioridade, dedupe, resolvido para URL absoluta, **cap N**):
  1. `<meta property="og:image">` (pode haver vários), `<meta name="twitter:image">`, `<link rel="image_src">`.
  2. `image` de **qualquer** nó JSON-LD (string ou array), não só Product.
  3. `<img>` da galeria do produto (dentro dos containers de produto já usados; ler `src`/`srcset`/`data-src` para lazy-load), reaproveitando o strip de nav/related que já existe.
- Contrato: `AnalyzeOk.images?: string[]` (substitui `image?: string`). **Migrar TODOS os consumidores (L2):** `types.ts`, `route.ts`, `ResultCard.tsx`, **`app/api/og/route.tsx`** e **`app/share/page.tsx`** (a imagem social usa `images[0]` — esquecer `/api/og` quebraria a alavanca de compartilhamento da Fase D).
- **Cada candidato passa por `resolveImage` (L3):** absolutiza vs. a URL da página e rejeita não-http(s); **descarta `data:` e SVG inline** (evita N requests inúteis ao proxy).

### A2. Não perder imagem no caminho reader (conserto barato, sem fetch extra)
- `fetchPage` **já** executou `directFetch` antes de cair no reader. Quando o reader é usado para o TEXTO, **mesclar as imagens do `extract` direto** (que já tem `og:image` em casos como Superdry). Zero rede extra. Só não há imagem quando o fetch direto foi bloqueado de fato OU a imagem é 100% JS (aí entra galeria de A1 ou headless/E).

### A3. UI — galeria maior + múltiplas (pedido do dono)
- No topo do `ResultCard`, trocar a imagem única por uma **galeria**: **strip horizontal com scroll-snap** (mobile-first), imagem maior que hoje (`max-h-80` → ~`max-h-96`/aspecto definido), 1ª imagem "eager", demais `loading="lazy"`. Cada imagem via `/api/image?src=`.
- **Guardrails (minha recomendação):** cap **≤ 4–5** imagens; 1ª eager, resto `lazy`; proxied (sem hotlink/referrer); discreto para não engolir o veredito.
- **L1 — pré-requisito de produção:** `/api/image` **não tem rate-limit** (só `/api/analyze` tem). A galeria multiplica 1→N requests por análise. **Endurecer o `/api/image` (rate-limit) é pré-requisito de subir a galeria para produção** (ou sair junto da Fase C). Cap+lazy reduzem, não eliminam (alguém chama `/api/image` direto).
- *(Ponto de decisão #A: layout — strip com scroll-snap **(recomendado)** vs. 1 grande + thumbnails vs. grid; e o cap N.)*

---

## B. Parse de JSON embutido (composição em `__NEXT_DATA__`/`__NUXT__`/inline)
- Em `extractText`, além do JSON-LD, varrer: `<script type="application/json">`, `<script id="__NEXT_DATA__">`, e scripts inline com `__NUXT__`/`window.__INITIAL_STATE__`.
- **Extração ALVO (anti-falso-positivo):** **não** despejar o blob inteiro (um state de SPA tem dezenas de produtos → composição de vizinho = inventar dado). Em vez disso, **percorrer o JSON e coletar só os valores de chaves** que casem `/composition|material|fabric|fiber|stoff|zusammensetzung|composic|materia/i`. Anexar esses valores ao texto do parser. As guardas existentes (rejeição de prosa, dedupe) seguem valendo.
- *(Ponto de decisão #B: agressividade — extração por chave-alvo **(recomendado, conservador)** vs. blob inteiro filtrado (mais cobertura, mais risco de vizinho).)*

---

## C. Refino de score — tee de algodão simples não é "low" — ✅ EXECUTADO (2026-06-16)
> Reproduzido no corpus (`hugoboss-jersey-tee`, `generic-jersey-tee-nogsm` → `low` value 22), conserto aplicado (`informativeWeave = weave != null && weave !== "jersey"` em `evaluate.ts`), 2 fixtures viraram `indeterminate`, nada mais mudou. +1 teste unit. Validado por curl + visual (Hugo Boss → "The tag stays quiet"). Detalhe abaixo.

- **Princípio:** a malha **padrão** da categoria não é sinal de qualidade. `jersey` numa camiseta é o default universal — não deve **corroborar** nada nem empurrar para "low". (Em shirt, o weave tecido distingue qualidade → continua corroborando; em pullover/hoodie, french-terry/fleece distinguem → continuam.)
- **Mudança (`evaluate.ts`):** excluir `weave === "jersey"` de `hasCorroboration`. Efeito: um tee genérico, `jersey`, **sem GSM** e sem outro sinal → passa a `indeterminate` ("a etiqueta se cala"), não "low". Um tee **com GSM leve** genérico segue `low` (evidência negativa real, via `gsmQuality ≤ 1 && !goodFiber`). 
- Reavaliar (sem mudar agora) o catch-all `value < 25 → low` para shirts genéricos — registrar achados do corpus; só mexer se a revalidação mostrar subavaliação análoga. *(Ponto de decisão #C: escopo — só exclusão de jersey **(recomendado)** vs. revisitar também `value < 25`.)*
- **A0 do escopo:** o snapshot do corpus vai mudar para alguns fixtures (tees jersey sem GSM). Auditar à mão cada diff (como na Fase A), nunca update cego.

---

## D. (opcional, barato) Retry de robustez
Como o bloqueio é intermitente, **1 retry** do reader (ou um 2º serviço de leitura) recupera vários casos flaky sem custo fixo. Pequeno; pode entrar como sub-passo final.

## Fora de escopo
**E — headless/residential (Playwright + `@sparticuz/chromium` ou ScrapingBee/Bright Data):** único conserto real para Akamai/Shape duro e specs 100% JS. Custo/infra → roadmap, só depois que a Fase D provar demanda.

## Riscos e mitigações
- **B → composição de produto vizinho:** mitigado por extração por **chave-alvo** (não blob) + guardas de prosa/dedupe.
- **Galeria → banda no `/api/image`** (sem rate-limit): cap N + lazy-load; endurecer o proxy junto da Fase C.
- **C → mudança no scorer:** rede de regressão (corpus) + auditoria manual dos diffs; cobre os fixtures de tee.
- **Honestidade:** A/B só expõem o que está **literalmente** no payload da página; nada inventado.

## Testes / validação
- Unit: `extractText` devolve `images: string[]` (og/twitter/json-ld array/galeria, dedupe, cap); merge de imagem no caminho reader; parse de JSON embutido por chave-alvo (fixture estilo Gap/Armani → acha "% cotton"); `evaluate` jersey-sem-GSM → `indeterminate`, e os casos `low` legítimos seguem `low`.
- Re-baseline do corpus (auditado).
- Visual (Docker MCP): galeria (desktop+mobile), e re-rodar **Superdry** (imagem deve aparecer), **Gap/Armani** (composição deve aparecer), e um tee simples (ex.: Hugo Boss → não mais "low").

## Pontos de decisão
1. **#A — Galeria:** layout (strip scroll-snap recomendado) + cap N (recomendo ≤ 4). + L1 (rate-limit `/api/image` pré-prod) + L3 (resolveImage por candidato).
2. **#B — JSON embutido:** chave-alvo conservador (recomendado) vs. blob filtrado.
3. **#C — Score:** ✅ **RESOLVIDO** — só exclusão de `jersey`, executado e validado. (O catch-all `value < 25` para shirts genéricos fica como observação futura; não houve subavaliação análoga no corpus.)
4. **#D — Retry:** incluir 1 retry agora (recomendo sim, barato) vs. adiar. **Cap de tempo total** p/ não estourar `maxDuration=30` (direct 9s + reader 18s + retry).
5. **L2 (migração `image`→`images`):** cobrir `/api/og` + `/share` além de `types`/`route`/`ResultCard`.

## Ordem de execução (se aprovado), commits por sub-passo
A0 corpus-baseline (se já não cobrir) → C (score, com re-baseline auditado) → A1+A2 (extração de imagens) → B (JSON embutido) → A3 (galeria UI) → D (retry) → docs (SPEC/DECISIONS) → validação (`lint`/`test`/`build` + visual Docker MCP nas URLs que falhavam).
