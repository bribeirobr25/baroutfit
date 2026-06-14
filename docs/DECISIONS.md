# DECISIONS.md — Decisões de arquitetura e limitações honestas

> Registro do "porquê". Leia antes de implementar para não redescobrir becos sem saída.

## 1. Por que proxy server-side é obrigatório (CORS)

Uma landing estática não consegue fazer `fetch` do HTML de lojas (Zara, Uniqlo, Hollister, etc.) direto do navegador: a maioria bloqueia cross-origin (sem cabeçalhos CORS permissivos). Por isso a leitura da página acontece numa **função serverless** no Vercel (ex.: `/api/analyze`), que faz a requisição server-to-server (sem CORS) e devolve só o resultado processado ao frontend.

Implicações:
- Enviar um `User-Agent` realista na requisição server-side; respeitar `robots.txt` quando aplicável e os Termos de cada site (ver §4).
- Tratar timeouts, redirecionamentos e respostas não-HTML.

## 2. Limitações reais (a UI deve refletir, não esconder)

1. **Lojas com JS pesado / SPA:** muitas carregam a ficha técnica depois, via API interna (o HTML inicial vem "vazio"). Nesses casos a função pode não achar GSM/composição → retornar `unreadable` ou `partial`, nunca inventar.
2. **Anti-bot (Cloudflare, etc.):** algumas páginas bloqueiam requisições automatizadas → `unreadable` com `reason: anti-bot`.

> **Mitigação implementada (2026-06-07) — fallback via reader-proxy.** Quando o fetch direto é bloqueado (anti-bot por IP de datacenter) ou a página é JS-heavy/thin, a função tenta um segundo caminho: o reader-proxy gratuito e sem chave `r.jina.ai`, que renderiza o JS a partir do **IP dele** e devolve texto. Isso resolve **Zara** e SPAs semelhantes (1 e 2 acima deixam de ser becos sem saída para esses casos). O texto do proxy é a página inteira (markdown), então o parser lê só a seção do produto (`focusReaderText`) para não atribuir dado de produto vizinho — honestidade acima de cobertura. Limite: lojas com anti-bot que bloqueiam também o proxy (Akamai/Shape, ex. **Hollister**) seguem `unreadable`. Cobri-las exige headless/proxy residencial (CLAUDE §7 roadmap). `JINA_API_KEY` opcional para limites maiores.
3. **Dado que não existe:** Zara/H&M frequentemente não publicam GSM. Não há solução técnica — só a etiqueta física. A ferramenta diz isso honestamente (`partial`, score `indeterminate`).
4. **Free tier do Vercel:** limites de execução/tempo das serverless functions. Manter a função enxuta; sem dependências pesadas de scraping headless na v1.

> **Postura de segurança (2026-06-14).** Como `/api/analyze` busca uma URL do usuário no servidor, há proteções: guarda anti-SSRF (rejeita IPs privados/reservados, portas fora de 80/443 e nomes internos; revalida cada redirect), teto de 4 MB no corpo lido (anti-OOM), e rate limit por IP. **Limitações honestas:** o rate limit é em memória/por-instância (best-effort; produção real → Vercel Firewall/BotID) e a guarda SSRF tem resíduo de DNS rebinding (TOCTOU). Detalhe no registro de build (§5.4, 2026-06-14).

## 3. Decisões travadas pelo dono (recap)
- Full-stack real; proxy serverless; Vercel free; i18n EN/PT-BR/DE/ES com detecção por browser; 4 categorias; ads como placeholder; UI minimalista com identidade de moda; stack à escolha do Claude Code; nunca inventar dados.

## 4. Ética / legal
- Ler páginas públicas de produto para análise pontual a pedido do usuário é diferente de scraping em massa. Ainda assim: respeitar ToS/robots, não armazenar conteúdo de terceiros além do necessário, não revender dados das lojas. Os cards de anúncio devem ser claramente marcados como publicidade.
- Sem dados pessoais na v1. Se logar URLs para debug, anonimizar.

## 5. A PREENCHER pelo Claude Code (antes de codar)

### 5.1 Stack escolhida

**Next.js 15 (App Router) + TypeScript, gerenciado com pnpm, deploy Vercel.**

Justificativa por requisito:

- **Proxy server-side / `/api/analyze`:** Route Handlers do App Router (`app/api/analyze/route.ts`) rodam como serverless functions no Vercel sem configuração extra. O `fetch` server-to-server resolve o CORS (CLAUDE.md §2.2, DECISIONS §1). Runtime **Node.js** (não Edge) para usar `cheerio` e ter timeout/headers completos.
- **Vercel free tier:** Next.js é o caminho de menor atrito no free tier (zero config de build, functions inclusas). A função é mantida enxuta, sem dependência headless (DECISIONS §2.4).
- **i18n EN/PT-BR/DE/ES com detecção por browser + seletor:** **não** usaremos roteamento por locale (`/en`, `/de`…) — o produto é tela única e o requisito é detecção automática via `navigator.language` com troca manual sem recarregar (I18N §1). Por isso um **provider de i18n leve e próprio** (React Context + 4 dicionários JSON), client-side, é mais aderente que `next-intl`/middleware de locale, que imporiam prefixo de URL. A API devolve `message_key`; o Context traduz. `<html lang>` atualizado dinamicamente.
- **UI com identidade de moda:** Next + CSS (CSS Modules ou Tailwind — decidir em 5.2) dá controle total de tipografia/animação sem peso de framework de componentes.

Alternativas descartadas: Vite SPA puro (precisaria de função serverless separada, mais setup no Vercel); Astro (bom para conteúdo, menos natural para o estado interativo input→analyzing→result); `next-intl` com roteamento por locale (conflita com tela única + detecção automática).

### 5.2 Plano de implementação (Option B: plano → aprovação → execução)

Decisões de detalhe a confirmar na aprovação: **Tailwind vs CSS Modules** (proposta: Tailwind v4 para velocidade + design tokens, mas tipografia editorial via `next/font` e CSS custom); fontes display/corpo (proposta: um serif/grotesk editorial + um sans legível, ambos via `next/font`, sem chamada externa).

**Fase 0 — Scaffold**
- `pnpm create next-app` (TS, App Router, sem `src/` ou com — definir), adicionar cheerio + vitest. `.gitignore`, `tsconfig` estrito. Estrutura: `app/`, `lib/parser/`, `lib/knowledge/`, `lib/i18n/`, `lib/extract/`, `app/api/analyze/`.
- README inicial (dev + deploy).

**Fase 1 — Knowledge base como dados tipados** (`lib/knowledge/`)
- Traduzir KNOWLEDGE-BASE.md para estruturas TS: faixas de GSM por categoria, ranking de fibras/tecelagens/fiação, tabela das 12 marcas auditadas (com `wrinkle`, `tier`, dados verificados), sinais de etiqueta. Fonte de verdade = KB + os 3 docs originais. Sem lógica aqui, só dados + tipos.

**Fase 2 — Parser + testes (núcleo, dirigido por fixtures)** (`lib/parser/`)
- Implementar o pipeline do PARSER.md: normalização, detecção de categoria, extração de tokens multi-idioma (EN/PT-BR/DE/ES), conversão oz→g/m², pontuação contra o guia, veredito de wrinkle, degradação de confiança.
- **Regra de ouro:** só `verified: true` o que está explícito; nunca derivar GSM de "heavyweight".
- Testes `vitest` com os casos mínimos do PARSER §8 (Asket Tee/Overshirt, Norse Falster, Hollister, Zara/H&M sem GSM, URL anti-bot). Fixtures = texto/HTML real salvo localmente. **Esta fase é a mais crítica e a que mais valida o produto.**

**Fase 3 — Extração de HTML + API** (`lib/extract/`, `app/api/analyze/route.ts`)
- Implementar a estratégia de 5.3 (fetch robusto → cheerio → JSON-LD/ficha/fallback → texto).
- Route Handler que valida body, chama extração + parser, monta o JSON do contrato (SPEC §3) com `message_key`s, trata `unreadable`/`partial`/timeout. Testes de integração da rota com fixtures.

**Fase 4 — i18n** (`lib/i18n/`)
- 4 dicionários (`en`, `pt-BR`, `de`, `es`) com todas as chaves de I18N.md. Provider (Context), detecção via `navigator.language`, persistência (cookie/localStorage), seletor manual, `<html lang>` dinâmico, `aria-live`. Garantir zero string hard-coded.

**Fase 5 — Frontend e estados** (`app/`)
- Tela única com os 4 estados (SPEC §2): **input** (validação de URL client-side), **analyzing** (microanimação CSS + texto rotativo + cards placeholder de anúncio claramente marcados), **result** (render escaneável do JSON na ordem do SPEC §4, diferenciando visualmente verified vs. a-conferir), **error/unreadable** (mensagem honesta). Mobile-first, acessível (teclado, foco, contraste AA).

**Fase 6 — Identidade visual / polish**
- Tipografia editorial, microanimações leves, cards de anúncio visualmente distintos do resultado. Garantir que não pareça "ferramenta genérica de AI".

**Fase 7 — Deploy + DoD**
- Deploy Vercel free, validar a função em produção com URLs reais, conferir o checklist de "Definition of done" (CLAUDE.md §8). README final com instruções de dev e deploy. Atualizar 5.4 com qualquer desvio.

**Ordem de prioridade de risco:** Fase 2 (parser) e Fase 3 (extração real) concentram o risco técnico — são onde "ler página de verdade sem inventar dado" se prova. Frontend/i18n são mais previsíveis.

### 5.3 Biblioteca de extração de HTML

**`cheerio`** para parsing leve do HTML server-side. Sem headless (Puppeteer/Playwright) na v1 — pesado demais para o free tier e desnecessário para páginas com ficha técnica no HTML inicial (DECISIONS §2.1, §2.4).

Estratégia de extração (na função `/api/analyze`, antes de passar texto ao parser):
1. `fetch` com headers de navegador realistas, timeout ~9s (fast path; o fallback reader-proxy tem ~18s), seguir redirects, abortar se resposta não-HTML ou status de erro → `unreadable`. (Ver fallback em §2.)
2. Com cheerio: remover `<script>`/`<style>`/`<nav>`/`<footer>`; extrair em ordem de prioridade (a) **JSON-LD** (`<script type="application/ld+json">` — muitas lojas expõem `Product` com material/descrição estruturados), (b) blocos de ficha técnica/descrição/composição, (c) texto visível geral como fallback.
3. Passar esse texto consolidado ao PARSER (que faz normalização + tokens multi-idioma).
4. Heurística de "página vazia/SPA": se o texto útil for muito curto ou não contiver nenhum sinal de composição → `partial`/`unreadable` conforme o caso, **nunca** inventar (PARSER §2, §7).

Sem outras dependências pesadas. Testes com `vitest` (rápido, TS nativo). Fixtures = HTML real salvo das marcas auditadas (PARSER §8).

### 5.4 Registro de decisões durante o build

- **2026-06-06 — Next.js 16, não 15.** `create-next-app@latest` instalou Next 16.2.7 + React 19.2 (Turbopack default). Mantido: nada do plano depende de 15-específico; App Router, Route Handlers e `next/font` são equivalentes. Stack final: Next 16 (App Router) + TS + Tailwind v4 + cheerio + vitest, pnpm.
- **2026-06-06 — i18n sem `src/`.** Projeto sem `src/dir`; `app/` e `lib/` na raiz, alias `@/*`.
- **2026-06-06 — Tailwind v4 + CSS Modules onde fizer sentido.** Aprovado pelo dono "Tailwind + proposta de fontes". Tipografia editorial via `next/font` (self-hosted, sem chamada externa). Fontes: **Fraunces** (display) + **Inter** (corpo). *(Trocadas no redesign de 2026-06-10 — ver entrada "Noir Couture" abaixo.)*
- **2026-06-06 — i18n sem roteamento por locale.** Provider próprio (React Context + 4 dicionários tipados, `en` como fonte de verdade), detecção via `navigator.language`, persistência em `localStorage`, `<html lang>` dinâmico. Paridade de chaves entre locales garantida por teste.
- **2026-06-06 — Score band: ausência de dado ≠ baixa qualidade.** Ajuste feito após teste no navegador contra asket.com: fibra boa sozinha (sem GSM/tecelagem/construção) agora resulta em `indeterminate` (+ confiança `partial`), nunca `low`. `low` exige evidência negativa real (GSM leve, poliéster alto). Isso honra o princípio "nunca inventar / ser honesto sobre lacunas".
- **2026-06-06 — Verificação no navegador (build de produção).** Os 4 estados (input/analyzing/result/error), troca + persistência de idioma, fetch server-side ao vivo e selo de marca auditada foram validados via Playwright em mobile (430px) e desktop (1280px). Obs.: em `next dev` sobre IP da LAN o HMR (Turbopack) não conecta e a hidratação não ocorre — testar interatividade com `pnpm build && pnpm start`. Não afeta produção (Vercel).
- **2026-06-06 — `maxDuration = 15` no route handler** para respeitar o teto de execução do free tier (SPEC: timeout de análise 15–20s); runtime `nodejs` (cheerio + controle total de fetch).

- **2026-06-06 — Lojas que bloqueiam leitura server-side (testado em produção).** Diagnóstico após o dono reportar "Couldn't read the page":
  - **Funcionam** (marcas diretas, sem anti-bot pesado): Asket, SANVT, Norse Projects, Merz b. Schwanen, UNIQLO. Ex.: SANVT 185 GSM, Norse 260 GSM, Merz 200 GSM — todos lidos ao vivo.
  - **Não funcionam** (bloqueio por IP de datacenter / TLS-fingerprint estilo Akamai, OU SPA JS-heavy): **Zara** (HTML inicial é shell de ~2,4 KB sem ficha — dado só existe após JS) e **Hollister** (serve a ficha completa a IP residencial, mas devolve 403 ao IP da Vercel). Retornam `anti-bot`/`js-heavy` corretamente.
  - **Conclusão:** é o resíduo irredutível por meios remotos (relatório §12.3). Sem solução no v1 (headless/proxy residencial fora do escopo/free tier). Melhoramos os headers (fetch-metadata + client hints) para ampliar cobertura em lojas com checagem simples; não vence Akamai. Comportamento honesto mantido: nunca inventa, diz "não foi possível ler".

- **2026-06-07 — Fallback via reader-proxy + ajustes (supera o item maxDuration=15 acima).**
  - Adicionado fallback gratuito/sem-chave `r.jina.ai` quando o fetch direto é bloqueado/thin (ver §2). **Zara passou a funcionar**; Hollister segue bloqueado (Akamai bloqueia o proxy também).
  - **`maxDuration` 15 → 30** e timeout do cliente → ~29s para acomodar direto (~9s) + reader (~18s). Lojas que abrem direto seguem em 1–3s.
  - **Refinamentos do parser** (todos com teste): confiança conta o `fiberType` como fibra mesmo sem composição "NN%"; regex de composição aceita markdown depois do valor; detecção de categoria por contagem + slug da URL autoritativo (imune a ruído de nav); texto do reader afunilado à seção do produto (`focusReaderText`) para não inventar dado de produto vizinho.
  - **Docs sincronizados** (SPEC §2/§3 contrato camelCase + timeout; PARSER §5/§7; I18N §2; CLAUDE §7 roadmap + §8 DoD; README). Suíte: 47 testes.

- **2026-06-07 — Auditoria de acurácia com 12 lojas reais + autorrevisão.** O dono testou 12 URLs; vários "ok" estavam imprecisos. Bugs encontrados e corrigidos (ver PARSER §4.1, §6):
  - composição duplicada ("100% cotton, 100% cotton, …") → dedupe;
  - categoria errada (Blue Tomato "T+Shirt") → `categoryFromUrl` trata separadores `+`/`_`/`%20`;
  - **falso `weave: denim`** (Dickies, vindo de card de produto relacionado) → extração remove links + cards/grids de relacionados; JSON-LD lido só de nós `Product` (ignora breadcrumb); JSON-LD passou a rodar **antes** de remover `<script>` (estava sempre vazio);
  - fibra colada ("cottonImported") → espaços entre elementos de bloco;
  - poliéster dominante (≥50%) → wrinkle `low`;
  - **falsa composição vinda de prosa** ("1% of the global cotton" da SANVT) → guarda de stopwords entre `%` e a fibra.
  - Autorrevisão endureceu efeitos colaterais: JSON-LD escopo `Product`, spacing sem `<span>` (não quebrar números), não remover `product-item`/`product-list` (PDP Magento), hood cue vence pullover. **Regressão validada ao vivo** nas marcas-âncora (Asket/SANVT/Norse/Merz) — sem drift. `extractText` ~89ms em página de 727 KB. Suíte: **55 testes**.

- **2026-06-07 — Pesquisa de marcas por mercado (8 mercados) + lote de KB destilado (Fase 1–2).** Trabalho de curadoria feito no chat (não-código), gravado em `docs/guides/`:
  - **8 cruzamentos mercado×guia** em `guides/cruzamentos/cruzamento-*.md` (EUA, Brasil, UK, Alemanha, França, Espanha, Itália, Portugal) + índice `guides/marcas-para-cruzamento-8-mercados.md`. Cada cruzamento separa fato (fibra/GSM/origem) de julgamento, e lista pendências explicitamente (nada assumido).
  - **Lição transversal:** "não amassa" ≠ "alta qualidade natural" — sintético puro (Sepiia/Xacus Active) e non-iron químico (Olymp/CT) vs. natural preferido pelo guia (TENCEL/modal, malha pesada). Confirmou a regra de olhar vários produtos por marca (Massimo Dutti varia 100% algodão → 70% poliéster).
  - **Lote de KB (handoff p/ Claude Code):** `guides/cruzamentos/knowledge-base-candidatos-verificados.md` — 3 marcas novas (Buck Mason 140/200/310/145; Maison Cornichon 195/290; ISTO. 160 Supima), todas via `web_fetch` de fonte oficial, + upgrade de `origin` da SANVT (Portugal / fio Itália). As 7 existentes reconferidas; ressalva registrada: **GSM 244 da Merz é oz de revendedor, não cravado pela oficial** (7.2 vs 8.6 oz divergem).
  - **Granularidade decidida:** por marca (o schema `AuditedBrand.products[]` já é por-produto, então múltiplos GSMs cabem sem mudar schema). **Não injeta em findings** — KB só alimenta o selo `brandMatch` (mantido).
  - **Próximo passo (Fase 3, no Claude Code):** integrar o lote em `lib/knowledge/brands.ts` + sync de `docs/KNOWLEDGE-BASE.md §7` (já atualizado neste commit), rodar test/lint/build, adicionar asserts de `matchBrandByHost` p/ buckmason.com/maisoncornichon.com/isto.pt. Aprofundamento futuro (lotes napolitano/pendentes ES-FR-US) volta ao chat antes de virar código.

- **2026-06-09 — Fase 3 executada: lote de marcas integrado ao código.** Fecha o "próximo passo" da entrada anterior.
  - `lib/knowledge/brands.ts`: +3 marcas / 7 produtos (Buck Mason, Maison Cornichon, ISTO.); `origin` da SANVT preenchido (Perfect→"Portugal", Heavyweight→"Portugal (yarn spun in Italy)"); header cita `guides/cruzamentos/`. As outras 6 intactas (Merz segue 244 como referência aproximada, ressalva no §7).
  - **Enum:** `Weave` sem `ribbed` → Côte 195g usa `jersey` + `construction:["ribbed 1x1","yarn 1/40"]`. Schema inalterado.
  - **Honestidade inalterada:** KB só alimenta `brandMatch`; nada em `findings`. Nenhum GSM inventado; `null` (Vans/UNIQLO/Norse) preservados.
  - **Gate:** +1 `it` em `matchBrandByHost`; **56 testes**, tsc/lint/build verdes. KB: 10 marcas, 20 produtos; `brands.ts` ↔ §7 em sync.
  - **Docs sincronizados neste passo:** `CLAUDE.md §4` (Fontes de verdade agora cita `guides/cruzamentos/`); header de `brands.ts` distingue originais (audit 06-06) vs. lote (web_fetch oficial).

- **2026-06-09 — Fase 4 (aprofundamento, pesquisa no chat): lotes 2–5 preparados, ainda NÃO integrados.** Continuação da curadoria, todos verificados em fonte oficial, gravados em `guides/cruzamentos/` com índice mestre `INDICE-lotes-fase4.md`. Cada lote é handoff independente para o Claude Code (Fase 5).
  - **Lote 2** (`...-lote2.md`, sem schema): verified = Asphalte (camisa c/ GSM 150/155), ISTO. camisas (4 produtos 140/160/175/200 — anexar à marca existente), American Giant (Supima oz→g 102/129/207). partial = Hast, Dudalina (Wrinkle Free = non-iron químico), Community Clothing.
  - **Lote 3** (`...-lote3.md`, MUDA SCHEMA): decisão do dono **Opção B** → adicionar `egyptian` a `FiberType` + `FIBER_QUALITY`(=4) + `PREMIUM_FIBERS`. verified = Finamore (Giza 45 170/2). partial = Kiton, Borrelli (100% cotton genérico; luxo é manufatura, não fibra cravada).
  - **Lote 4** (`...-lote4.md`, sem schema): pendentes ES, todos partial e opcionais. Pompeii (origem PT), Silbon; **Scalpers não recomendado** (marginal).
  - **Lote 5** (`...-lote5.md`, MUDA SCHEMA): decisão do dono **Opção 2** → adicionar `modal` a `FiberType` + `FIBER_QUALITY`(=4) + `PREMIUM_FIBERS`. verified = Insider (92% TENCEL modal + 8% elastano; NEXTECH = TENCEL Lyocell). **Sepiia deliberadamente fora** (100% poliéster — parser já penaliza; KB é curadoria de qualidade natural).
  - **Duas decisões de escopo do dono:** (1) algodão egípcio/Giza vira `fiberType: egyptian` (Giza 45 fica no campo `fiber` como texto, não vira enum); (2) tech entra só com fibra natural (Insider sim, Sepiia não).
  - **Próximo passo (Fase 5, no Claude Code):** integrar lotes 2–5 incrementalmente (ordem sugerida no índice), isolando cada mudança de schema (egyptian, modal) em commit próprio; partials só com aprovação explícita. Mesmo gate: test/lint/build verdes, asserts de `matchBrandByHost`, sync `brands.ts` ↔ KNOWLEDGE-BASE §7.

- **2026-06-10 — Fase 5 executada: lotes 2/3/5 + partials integrados.** Fecha o "próximo passo" da Fase 4.
  - **Verified:** lote 2 (Asphalte, ISTO. camisas, American Giant), lote 3 (egyptian + Finamore), lote 5 (modal + Insider). Cada mudança de enum (`egyptian`, `modal`) em commit isolado.
  - **Partials aprovados pelo dono (per-brand):** Hast, Kiton, Luigi Borrelli, Pompeii, Dudalina (só Comfort Jacquard; `long-staple`, **não** `egyptian` — anti-inflação: "egípcio" de marketing sem fio/cert. por SKU ≠ Giza 45 cravado da Finamore; Wrinkle Free fora por ser non-iron químico).
  - **Backlog opcional (NÃO integrados, decisão do dono):** Silbon (ES), Community Clothing (UK), Scalpers (ES, marginal). Podem entrar depois como `partial` se o dono quiser cobertura — dados nos handoffs `guides/cruzamentos/...-lote2.md` e `...-lote4.md`.
  - Sepiia (poliéster) e Dudalina Wrinkle Free deliberadamente fora — não premium natural.
  - **KB final: 19 marcas, 39 produtos.** 62 testes, tsc/lint/build verdes. KB só alimenta o selo `brandMatch` (nunca `findings`); nenhum GSM inventado; `null` preservados; parser intacto (decisão (a) — detecção de egyptian/modal no `detectFiberType` fica no roadmap CLAUDE §7). Commits: `40ceee6` (lote 2), `a033b56` (lote 3), `519c2cd` (lote 5), `a3ac8e8` (partials), além de `f04795d` (fontes/decisões Fase 4).

- **2026-06-10 — Redesign de UI/UX "Noir Couture" + voz Don Draper (a pedido do dono).** Revisão completa de identidade, focada em desejo, não em função. Lógica/parser/KB intactos.
  - **Identidade:** palco preto absoluto, tipografia creme, acento **chartreuse elétrico** (anti-apático). Três vozes tipográficas: **Bodoni Moda** (display couture) + **Inter** (corpo) + **Space Mono** (dados/etiqueta) — substituem Fraunces+Inter. `themeColor` escuro.
  - **Conceito do resultado:** o veredito deixou de ser um card e virou uma **etiqueta de composição** (creme sobre preto; ilhós, costura tracejada, dados em mono com pontilhado, ícone de ferro para "amassa?", selo AUDITED). Ordem de render do SPEC §4 preservada.
  - **Voz Don Draper.** Copy reescrito por estado. **EN** = voz original; **PT/DE/ES** = adaptação cultural (NÃO 1:1): idiomatismos nativos + trocadilho "etiqueta vs tecido" ("Mais etiqueta que tecido" / "Mehr Schein als Stoff" / "Más etiqueta que tela"). Rótulos de dado (category/finding) seguem claros/técnicos.
  - **Sem travessões "—" na UI** (viraram ponto/vírgula/·); removido o kicker "Fabric Report".
  - **Engajamento:** exemplos clicáveis **por mercado** (`lib/examples.ts`, `EXAMPLES_BY_LOCALE`): EN→US/UK, PT-BR→Brasil, DE→Alemanha, ES→Espanha — todas as URLs vetadas ao vivo. Nova chave i18n `input.tryExamples`.
  - Validado visualmente (desktop/mobile, 4 idiomas) via Playwright (instalado/removido só para a checagem; não fica no projeto). Acessibilidade preservada (foco chartreuse, aria-live, contraste). 62 testes verdes. Commits: `f679041` → `e35379f` (etiqueta) → `02302ef` → `56ff782` (sem dash + exemplos por mercado) → `378bd8d` (Draper PT/DE/ES).

- **2026-06-14 — Endurecimento de segurança + sync de i18n/CI (revisão pós-deploy).** Sem mudança de lógica de parser/KB. Tudo com teste e validação visual (Docker MCP, EN+DE, 4 estados). Branch `hardening/security-a11y-i18n-ci` → 6 commits atômicos em `main`.
  - **SSRF (`lib/extract`):** `assertSafeUrl` rejeita IPs privados/reservados (IPv4+IPv6, incl. metadata `169.254.169.254`), portas fora de 80/443 e nomes internos (localhost/.local/.internal/host sem ponto); resolve DNS e revalida. `safeFetch` segue redirects manualmente, revalidando cada hop. Resíduo: DNS rebinding (TOCTOU) — documentado; fechar exige dispatcher próprio, fora do free tier.
  - **OOM:** corpo de resposta (fetch direto e reader-proxy) lido com teto de 4 MB (`readBodyCapped`).
  - **Rate limit (`route.ts`):** janela deslizante por IP em memória (30/min) → `429` + `Retry-After`; novo `UnreadableReason: "rate-limited"` (SPEC §3). Best-effort/por-instância; produção real → Vercel Firewall/BotID (anotado no código).
  - **Headers de segurança (`next.config.ts`):** CSP (`frame-ancestors 'none'`, `object-src 'none'`, script/style/connect/font/img escopados), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS. Dev relaxa `script-src 'unsafe-eval'` + `connect-src ws:` (HMR); produção estrita.
  - **CI:** `.github/workflows/ci.yml` (pnpm 10 + Node 22) roda lint+test+build em push/PR — não existia antes.
  - **i18n (sem string hard-coded):** 5 literais que vazavam inglês (header da etiqueta, selo Audited, kicker de erro, kicker analyzing, tagline do rodapé) movidos para os 4 dicionários — novas chaves `app.footerTagline`, `analyzing.reading`, `result.reportLabel/auditedTag/noReading` (I18N §2).
  - **a11y/perf:** removido `aria-live` aninhado (uma única região no Analyzer); pesos do Bodoni Moda reduzidos aos usados (400/600/700/900; o 300 não existe na fonte e o 500/800 não eram usados).
  - **Gate:** **67 testes** (suíte +8 de SSRF), tsc/lint/build verdes. Headers/SSRF/rate-limit/happy-path validados ao vivo (curl) e no browser (Docker MCP, EN+DE, estados input/analyzing/result/error, zero erro de console).

- **2026-06-14 — Nome definido (BAR Outfit) + novo copy (Direção B) + projeto Vercel próprio.** O dono escolheu **BAR Outfit** (`APP_NAME` em `lib/brand.ts`; encerra o placeholder `[NOME_DO_PROJETO]`). Copy da home trocado para a "Direção B" (identidade-primeiro): manchete "You are what you wear. / Most people never read it.", tagline "Skip the brand story. We weigh the fabric and tell you what it really is.", além de placeholder/botão/tryExamples/rodapé — EN como fonte e PT/DE/ES adaptados (não 1:1, sem travessões). Metadata (`<title>`/OG/description) acompanha; masthead perdeu o `lowercase` para respeitar a caixa "BAR Outfit". Sem mudança de parser/KB/lógica. Deploy num **novo projeto Vercel** para servir em `baroutfit.vercel.app` (se o subdomínio estiver livre); o projeto `roupas`/`roupas-khaki` segue existindo.

## 6. Status do Definition of Done (CLAUDE.md §8)

- [x] Stack escolhida e justificada (§5.1).
- [x] `/api/analyze` lê página real e devolve JSON estruturado (validado ao vivo contra asket.com).
- [x] Parser cobre as 4 categorias e tokens nos 4 idiomas (38 testes).
- [x] Nunca inventa GSM/fibra ausente; degrada confiança corretamente (validado).
- [x] i18n com detecção por browser + seletor; nenhuma string hard-coded.
- [x] Estados de UI: input, analyzing (animação + cards placeholder), result, error.
- [x] Responsivo e acessível (aria-live, foco visível, contraste, `lang` correto).
- [x] **Deploy no Vercel free** — produção em https://roupas-khaki.vercel.app (conta `bribeirobr`). Função serverless validada ao vivo contra asket.com (categoria, parser, selo de marca auditada, confiança parcial honesta).
- [x] README com instruções de dev e deploy.
