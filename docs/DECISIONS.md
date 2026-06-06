# DECISIONS.md — Decisões de arquitetura e limitações honestas

> Registro do "porquê". Leia antes de implementar para não redescobrir becos sem saída.

## 1. Por que proxy server-side é obrigatório (CORS)

Uma landing estática não consegue fazer `fetch` do HTML de lojas (Zara, Uniqlo, Hollister, etc.) direto do navegador: a maioria bloqueia cross-origin (sem cabeçalhos CORS permissivos). Por isso a leitura da página acontece numa **função serverless** no Vercel (ex.: `/api/analyze`), que faz a requisição server-to-server (sem CORS) e devolve só o resultado processado ao frontend.

Implicações:
- Enviar um `User-Agent` realista na requisição server-side; respeitar `robots.txt` quando aplicável e os Termos de cada site (ver §4).
- Tratar timeouts, redirecionamentos e respostas não-HTML.

## 2. Limitações reais (a UI deve refletir, não esconder)

1. **Lojas com JS pesado / SPA:** muitas carregam a ficha técnica depois, via API interna (o HTML inicial vem "vazio"). Nesses casos a função pode não achar GSM/composição → retornar `unreadable` ou `partial`, nunca inventar. (Opção futura: renderização headless — fora do escopo/free tier v1.)
2. **Anti-bot (Cloudflare, etc.):** algumas páginas bloqueiam requisições automatizadas → `unreadable` com `reason: anti-bot`.
3. **Dado que não existe:** Zara/H&M frequentemente não publicam GSM. Não há solução técnica — só a etiqueta física. A ferramenta diz isso honestamente (`partial`, score `indeterminate`).
4. **Free tier do Vercel:** limites de execução/tempo das serverless functions. Manter a função enxuta; sem dependências pesadas de scraping headless na v1.

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
1. `fetch` com `User-Agent` realista, timeout ~12s, seguir redirects, abortar se resposta não-HTML ou status de erro → `unreadable`.
2. Com cheerio: remover `<script>`/`<style>`/`<nav>`/`<footer>`; extrair em ordem de prioridade (a) **JSON-LD** (`<script type="application/ld+json">` — muitas lojas expõem `Product` com material/descrição estruturados), (b) blocos de ficha técnica/descrição/composição, (c) texto visível geral como fallback.
3. Passar esse texto consolidado ao PARSER (que faz normalização + tokens multi-idioma).
4. Heurística de "página vazia/SPA": se o texto útil for muito curto ou não contiver nenhum sinal de composição → `partial`/`unreadable` conforme o caso, **nunca** inventar (PARSER §2, §7).

Sem outras dependências pesadas. Testes com `vitest` (rápido, TS nativo). Fixtures = HTML real salvo das marcas auditadas (PARSER §8).

### 5.4 Registro de decisões durante o build

- **2026-06-06 — Next.js 16, não 15.** `create-next-app@latest` instalou Next 16.2.7 + React 19.2 (Turbopack default). Mantido: nada do plano depende de 15-específico; App Router, Route Handlers e `next/font` são equivalentes. Stack final: Next 16 (App Router) + TS + Tailwind v4 + cheerio + vitest, pnpm.
- **2026-06-06 — i18n sem `src/`.** Projeto sem `src/dir`; `app/` e `lib/` na raiz, alias `@/*`.
- **2026-06-06 — Tailwind v4 + CSS Modules onde fizer sentido.** Aprovado pelo dono "Tailwind + proposta de fontes". Tipografia editorial via `next/font` (self-hosted, sem chamada externa).
