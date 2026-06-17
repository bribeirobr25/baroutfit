# Plano — Galeria do resultado: dedup honesto + mais imagens (com gates) + UI/zoom + link da loja

> **Status:** **G1 ✅ + G2 ✅ + G3 ✅ EXECUTADOS (2026-06-17)** · AUDITADO + corrigido antes de codar (1 falha crítica: Gate B zeraria Shopify). Decisões #G-A/#G-B fixadas como recomendado (A+B+C; thumbs≥3/dots=2). · **Modelo:** Option B (CLAUDE.md §5).
> **G3 executado:** lightbox/zoom — clicar no slide abre tela cheia (mesma imagem proxied), setas + ←/→ para paginar, Esc/backdrop/✕ para fechar, **focus-trap + retorno de foco**, `role=dialog`/`aria-modal`, contador, scroll de fundo travado. Portal só quando aberto (SSR-safe — `lightboxOpen=false` no SSR, `createPortal` nunca roda no render estático). 153 testes (+2 markup do Lightbox: dialog/aria/contador/setas clampeadas). lint/build limpos. **Pendente:** validação visual interativa ao vivo (abrir/paginar/fechar/foco) — bloqueada pela queda recorrente do Docker MCP nesta sessão; a fazer no reconnect.
> **G1 executado:** dedup por identidade (Norse 2→1 honesto; Superdry 5 distintas) nos dois paths (direct + reader), Gates A/B/C (Gate B oportunista — guard de regressão Shopify), 4 fixtures reproduce-first. Live-verificado.
> **G2 executado:** galeria redesenhada (strip swipe + setas desktop + thumbnails≥3/dots=2, índice ativo sincronizado do scroll) + link "abrir na loja" (`sourceUrl` threaded do Analyzer; `target=_blank` `rel=noopener`; host exibido). i18n 4 idiomas. 151 testes, lint/build limpos, validação visual Docker MCP (Superdry 5 imgs+thumbs+setas; navegação por seta sincroniza thumb ativa; link "ABRIR NA LOJA · SUPERDRY.DE").
>
> **Achados da auditoria (corrigidos no texto abaixo):** (1) 🔴 **Gate B como filtro DURO zeraria Shopify** — o nome do arquivo (`N01-0679-0001-10.jpg`) não contém o handle (`norse-standard-…`); vira **oportunista** (só filtra se ≥1 imagem casar; senão ignora). (2) 🟠 **Gate A "ancestral do og:image" é inválido** (og:image fica no `<head>`) → reformulado para "coletar só após o strip de related/nav/carousel já existente, de containers de produto/galeria; escopo de container só como preferência suave". (3) 🟠 **Gate C** avalia a **largura MÁX do `srcset`**, não o `src` base (não derrubar foto válida com default pequeno). (4) 🟠 **Dedup** normaliza só para COMPARAR; guarda uma URL real (preferir `https` + maior largura), nunca a string normalizada. (5) 🟠 **Lightbox**: portal só client e só quando aberto (SSR/test-safe — fechado por padrão, `createPortal` não roda no render estático). (6) 🟡 teste atual da galeria será reescrito (estrutura muda a contagem de `<img>`). (7) 🟡 **Honestidade:** após dedup, Norse mostra **1** legítima; ampliar só revela o que a página expõe server-side — sem manufaturar.
> **Side-effects verificados:** `/share` **não** renderiza `ResultCard` (monta o próprio OG) → `sourceUrl` como prop é seguro; `share()`/`/api/og` inalterados (`sourceUrl` não entra no contrato).
> Pedido do dono: o card mostra "1 imagem"; quer **mais de uma**, **UI melhor**, **zoom/abrir maior + passar pelas imagens**, e um **link direto para a loja**. Autorizou **ampliar a extração** desde que com **gates para minimizar vazamento de vizinho**.
> Camadas: **COLETAR** (G1 — dedup + ampliação com gates) → **MOSTRAR** (G2 — UI + link da loja; G3 — lightbox/zoom). Liga-se ao roadmap §7/L-B ("a fronteira é ESCOPO, não técnica") e ao princípio fundador (nunca inventar; honesto sobre lacunas).

## Diagnóstico (por que parece "1 imagem") — medido, não suposto
1. **Quase-duplicatas (a causa real).** Em lojas Shopify (ex.: Norse) as 2 imagens extraídas são **a MESMA foto em tamanhos/crops diferentes**: `…/N01-0679-0001-10.jpg?…width=2048` e `…/N01-0679-0001-10.jpg?crop=center…width=1200`. Dedupamos por **URL exata**, então sobrevivem como "2" sendo 1 foto. (Superdry tem 5 distintas de verdade.)
2. **Sem affordance.** A galeria é uma tira scroll-snap horizontal, cada imagem `w-full`, **sem setas/dots/thumbs** — no desktop vê-se uma e não se sabe rolar.

→ Consertar a UI sem consertar o dedup só mostraria a mesma foto duas vezes. **Dedup é pré-requisito**, não polimento.

---

## G1 — COLETAR: dedup por identidade + ampliação com gates anti-vizinho

### G1.1 — Dedup por identidade de imagem (honestidade do número)
- Normalizar o candidato antes de comparar: protocolo (http=https), host em minúsculas, e **remover parâmetros de redimensionamento/versão** (`width,height,w,h,crop,fit,quality,q,dpr,sw,sh,v,version,format`). Comparar por `host+path(+params relevantes restantes)`.
- Variantes do mesmo arquivo colapsam em **uma** entrada. **Normalizar é só para COMPARAR** — a entrada guardada é sempre uma **URL real e funcional** (nunca a string normalizada/sem-params): preferir a variante **`https` + maior `width`** declarada, senão a primeira.
- Efeito honesto: Norse → 1 (é o que a loja realmente expõe via og/JSON-LD); Superdry → 5 (distintas). **Nunca padding** com variantes.

### G1.2 — Ampliar a coleta de galeria, com 4 GATES (escopo > técnica, §7/L-B)
Hoje os seletores de galeria do P2.2 são conservadores mas **page-wide**. Ampliar para pegar mais fotos distintas **só dentro de gates**:

- **Gate A — Escopo via strip + containers de produto (NÃO "achar O container").** Manter o **strip já existente** de related/nav/carousel/upsell/cross-sell/you-may-like (`extractText` já remove isso ANTES de coletar imgs) como o escopo primário, e coletar `<img>` **só de containers de produto/galeria/media/pdp** — nunca varrer `<img>` da página inteira. *Correção da auditoria:* a ideia de "ancestral comum do og:image" é inválida (og:image vive no `<head>`, sem ancestral no `<body>`) e "achar O container" é frágil (galeria costuma estar em coluna DOM separada do `<h1>`) — então o escopo vem do **strip + seletores de container**, e a proximidade ao `<h1>` entra só como **preferência suave** de ordenação, jamais como requisito (não excluir galeria válida).
- **Gate B — Casamento por handle/SKU, OPORTUNISTA (nunca filtro duro).** Derivar handle/SKU da URL (Shopify `/products/<handle>`; senão último segmento + grupos de dígitos). **Só filtrar quando ≥1 candidata casar** o token: aí mantém as que casam e descarta as que não. **Se NENHUMA casar** (caso comum — CDNs nomeiam por asset-id, ex.: `N01-0679-0001-10.jpg` não contém o handle), **ignorar o Gate B** e cair no Gate A. *Correção da auditoria:* como filtro duro, zeraria Shopify (regressão pior que hoje).
- **Gate C — Anti-thumbnail pela largura MÁX do srcset.** Computar a **maior** largura entre `srcset` (descritores `w`), `width=`/`w=` na query e atributo `width`; descartar só se esse **máximo** < 300px. *Correção da auditoria:* avaliar o `src` base derrubaria fotos válidas servidas pequenas-por-default com `srcset` grande.
- **Gate D — Cap + posição + dedup.** Manter `MAX_IMAGES` e G1.1; galerias vêm **antes** de seções de relacionados no DOM, então preferir as primeiras do container.
- **Princípio:** se após os gates sobrar 1 distinta, mostra 1. Honestidade > volume. Em dúvida, **excluir** (preferir falso-negativo a vazar vizinho).

### G1.3 — Reproduzir ANTES (fixtures de extração)
- (a) Shopify com 2 variantes do mesmo arquivo → **1** após dedup.
- (b) PDP com galeria (3 imgs no container do produto) **+ carrossel "related" (1 img de outro SKU)** → **3**, vizinho **excluído** (Gate A/B).
- (c) Tira de thumbnails (`width=80`) no container → **excluídas** (Gate C).
- (d) Reader-path (markdown) inalterado; dedup G1.1 aplica.

---

## G2 — MOSTRAR: galeria redesenhada + link da loja

### G2.1 — Link "abrir na loja"
- O contrato **não carrega** a URL da página. Threadar a URL **colada pelo usuário** (já validada) do `Analyzer` (estado `value`) → `ResultCard` via prop `sourceUrl` (opcional). Em `/share` (sem a URL) o link some.
- Render: "Open on the store" (i18n EN/PT/DE/ES), `target="_blank" rel="noopener noreferrer"`, rótulo claro de que é **a página que você colou** (sem ar de endosso). Mostra o host (ex.: "norseprojects.com").

### G2.2 — Galeria (UI)
- **Mobile-first preservado:** swipe (scroll-snap) continua.
- **Desktop:** imagem principal + **fileira de thumbnails** (ou dots se 1–2) + setas prev/next; índice ativo destacado.
- Aspecto consistente (container com razão fixa; `object-contain` sobre `bg-paper`), estética Atelier (linhas finas, mono nos rótulos).
- 0 imagens → **empty-state honesto** atual (M3) inalterado.
- Continua via `/api/image` (same-origin) → **CSP `img-src 'self'` intacta**.

## G3 — MOSTRAR: lightbox / zoom
- Clique na imagem principal → **modal** em tela cheia com a mesma imagem proxied (maior).
- Fechar: `Esc` + clique no backdrop + botão. Navegar: setas na tela **e setas do teclado** (←/→). **Focus-trap** + retorno de foco ao fechar; `aria-modal`, `role="dialog"`, `aria-label`.
- **`prefers-reduced-motion`**: sem animação de zoom quando setado.
- Sem dependência nova (React state + portal/overlay próprio).
- **SSR/test-safe (correção da auditoria):** o portal é **client-only e só montado quando aberto** (`open` começa `false`), então `createPortal` **não** roda no `renderToStaticMarkup` dos testes nem no SSR. Guardar com flag `mounted` (useEffect) se necessário.

---

## Riscos e gates (resumo)
| Risco | Mitigação |
|---|---|
| Vizinho/related vira foto do produto | Gate A (escopo ao container) + Gate B (handle/SKU) + dúvida→excluir |
| Thumbnails/ícones poluindo | Gate C (largura < 300 fora) |
| Mesma foto repetida (parece "2") | G1.1 dedup por identidade |
| Inventar galeria onde só há 1 | nunca padding; mostra o que existe |
| CSP | tudo via `/api/image` (same-origin), inalterada |
| Link externo | URL do próprio usuário, validada, `noopener` |
| Acessibilidade do lightbox/carrossel | teclado + focus-trap + aria + reduced-motion |
| Peso/deps | in-house, sem lib de carrossel |

## Testes / validação
- **Unit (`extract.test.ts`):** G1.1 dedup de variantes; G1.2 Gates A–D (fixtures b/c — vizinho e thumbnail fora); honestidade (1 distinta → 1).
- **Unit (`ResultCard.test.tsx`):** N thumbs renderizados; link da loja presente com `sourceUrl` e ausente sem; empty-state intacto; lightbox abre/fecha (render + aria).
- **Live (curl):** Norse → 1 distinta (não 2); Superdry → 5; um PDP com related → sem vizinho.
- **Visual (Docker MCP):** galeria desktop (thumbs+setas) e mobile (swipe); lightbox (abrir/passar/fechar, teclado); link da loja; PT (i18n). 0 erros de console.
- `pnpm test` + `lint` + `build` verdes; `pnpm smoke` após deploy (§6/OPS-1).

## Ordem (commits atômicos)
**G1 (dedup + gates)** → **G2 (UI + link)** → **G3 (lightbox)**. Cada um isolado, com fixtures e validação visual; pode-se parar após qualquer um.

## Fora de escopo
- Headless/proxy residencial (buckets bloqueados).
- Imagens de variante de cor/tamanho como facetas separadas.
- Proveniência por campo (P2.4) — independente.

## Pontos de decisão
- **#G-A — agressividade da ampliação:** Gate A+B+C **(recomendado)** vs. só Gate A (mais conservador, menos fotos). Default: A+B+C, errando para excluir.
- **#G-B — thumbnails como navegação vs. dots:** thumbs quando ≥3 imagens; dots quando 2. (Recomendado.)
