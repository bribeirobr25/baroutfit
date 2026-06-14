# CLAUDE.md — BAR Outfit

> **Para o Claude Code:** este é o documento mestre do projeto. Leia-o por completo antes de escrever qualquer código, e leia também os documentos referenciados na seção "Documentação do projeto". Eles contêm requisitos, restrições e a base de conhecimento que tornam este projeto possível. Não pule a leitura — várias decisões aqui existem para evitar becos sem saída técnicos (CORS, lojas com anti-bot, dados que não existem publicamente) que custariam tempo se redescobertos.

> **Nome do projeto:** o dono escolheu **BAR Outfit** (2026-06-14). O nome está centralizado em `lib/brand.ts` (`APP_NAME`); a UI (masthead/rodapé), o `<title>`/OpenGraph e a etiqueta de resultado leem dali. (Os nomes internos de classes CSS `roupas-*` e o `name` do `package.json` permanecem — são identificadores internos, não texto de marca.)

---

## 1. Visão geral

BAR Outfit é uma landing page pública e compartilhável onde qualquer pessoa cola a **URL de um produto de vestuário** (camiseta básica, camisa de botão, moletom ou moletom com capuz) de uma loja online. A aplicação lê a página do produto, extrai as informações técnicas do tecido, compara com um **guia de qualidade** pré-definido (e, quando aplicável, com um **relatório de marcas já auditadas**), e mostra um resultado **simples de entender**: a peça é de boa qualidade? Amassa muito? O que falta saber?

O propósito não é vender roupa nem rankear marcas "cool". É dar à pessoa um veredito honesto sobre qualidade de tecido, do mesmo jeito que um comprador experiente faria ao ler a etiqueta — separando o que é **fato verificável** do que é **marketing**.

**Princípio inegociável (vale para todo o projeto):** a aplicação **nunca inventa dados**. Se a gramatura (GSM) não está na página, o resultado diz "não informado", não chuta. Se a página não pôde ser lida, diz isso claramente. Honestidade sobre lacunas é a credibilidade do produto. Toda decisão de design e de código deve respeitar isso.

---

## 2. Decisões já travadas (não reabrir sem motivo)

Estas decisões foram tomadas pelo dono do projeto. O Claude Code deve segui-las:

1. **Full-stack real desde o início.** Não é protótipo com dados simulados. A análise lê páginas de verdade.
2. **Proxy server-side é obrigatório (por CORS).** O frontend **não pode** buscar a URL da loja diretamente do navegador — a maioria das lojas bloqueia cross-origin. A leitura da página acontece numa **função serverless** (ex.: `/api/analyze`). Ver `docs/DECISIONS.md` para o detalhamento.
3. **Deploy no Vercel, plano free.** A arquitetura precisa caber nas limitações do free tier (serverless functions, sem servidor persistente, sem banco de dados obrigatório na v1).
4. **i18n em 4 idiomas: EN, PT-BR, DE, ES.** Idioma inicial **detectado automaticamente** via `navigator.language` (fallback EN), com seletor manual sempre disponível. Ver `docs/I18N.md`.
5. **Quatro categorias de peça:** t-shirt (camiseta básica), shirt (camisa de botão), pullover (moletom), hoodie (moletom com capuz). Ver `docs/PARSER.md`.
6. **Cards de anúncio = placeholders visuais** na v1 ("Espaço publicitário" / "Ad space"). Sem integração de ads real ainda. Devem ser **visualmente distintos** do resultado da análise, para não confundir o usuário nem comprometer a imparcialidade.
7. **UI/UX minimalista, mas com identidade de moda.** Não pode parecer um formulário genérico. Ver seção 6 e `docs/SPEC.md`.
8. **Stack: à escolha do Claude Code.** O dono não tem preferência fixa. Escolha a stack que melhor atenda aos requisitos acima (Next.js App Router é um forte candidato por i18n nativo + API routes + deploy Vercel de primeira, mas a decisão é sua). **Documente a escolha e a justificativa** num `docs/DECISIONS.md` (seção "Stack escolhida") antes de codar.

---

## 3. Arquitetura (alto nível)

```
Usuário cola URL
      │
      ▼
[ Frontend ]  ── valida URL, mostra estado "analisando" (animação) ──┐
      │                                                               │
      ▼                                                               │
[ /api/analyze ] (serverless)                                         │
      │  1. fetch do HTML da página (server-side, sem CORS)           │
      │  2. extrai texto relevante (composição, GSM, tecido, fit…)    │
      │  3. roda o PARSER (tokens multi-idioma → estrutura)           │
      │  4. pontua contra o GUIA (KNOWLEDGE-BASE)                      │
      │  5. se a marca está no RELATÓRIO auditado, complementa        │
      │  6. devolve JSON: categoria, achados, faltantes, score,       │
      │     veredito de amassado, nível de confiança                  │
      ▼                                                               │
[ Frontend ] ── renderiza resultado simples + estado de confiança ◄──┘
```

Detalhes de cada etapa: `docs/SPEC.md` (fluxo e estados), `docs/PARSER.md` (extração e pontuação), `docs/KNOWLEDGE-BASE.md` (guia + marcas).

---

## 4. Documentação do projeto (LER TODOS)

Os arquivos abaixo estão em `docs/` (na mesma árvore deste CLAUDE.md). **São de leitura obrigatória** antes de implementar:

- **`docs/SPEC.md`** — Especificação funcional: jornada do usuário, estados de tela (input → analisando → resultado/erro), formato do resultado, requisitos de UX, acessibilidade.
- **`docs/PARSER.md`** — Núcleo técnico: todos os tokens a extrair nos 4 idiomas, regras de classificação por categoria, lógica de pontuação, regra de degradação de confiança, e o veredito de "amassa muito?".
- **`docs/KNOWLEDGE-BASE.md`** — As faixas do guia de qualidade (GSM por peça, hierarquia fibra > tecido > construção > GSM > marca) e a tabela de marcas já auditadas com dados verificados.
- **`docs/I18N.md`** — Estratégia de internacionalização, detecção de idioma, e as chaves de tradução com o copy base em EN/PT-BR/DE/ES.
- **`docs/DECISIONS.md`** — Decisões de arquitetura e **limitações honestas** (CORS, lojas com JS/anti-bot, dados inexistentes). Inclui a seção que o Claude Code deve preencher com a stack escolhida.

### Fontes de verdade (NÃO copiar, referenciar e extrair)

Os arquivos abaixo são a origem do guia, do relatório e da auditoria. O `docs/KNOWLEDGE-BASE.md` já destila deles o que o app precisa, mas em caso de dúvida, eles mandam. Caminhos relativos a partir da raiz do projeto (onde está este CLAUDE.md):

- `docs/rules/guia-qualidade-roupas-2026-v2.md` — o guia de qualidade (critérios, faixas de GSM, hierarquia, anti-amassado).
- `docs/guides/relatorio_final_marcas_guia_qualidade_2026.md` — o relatório de marcas auditadas (Asket, Norse, SANVT, Merz, Hollister etc.), com dados verificados contra fonte oficial.
- `docs/audit/revisao_relatorio_marcas_2026-06-06.md` — a auditoria que validou o relatório (contexto sobre o que é verificado vs. pendente).
- `docs/guides/cruzamentos/` — cruzamentos marca×mercado (8 mercados) + o handoff `knowledge-base-candidatos-verificados.md`. Fonte das marcas do lote 2026-06-07 (Buck Mason, Maison Cornichon, ISTO.), com o método de verificação por marca (web_fetch oficial vs. busca) e a distinção fato/julgamento. Índice das marcas pesquisadas: `docs/guides/marcas-para-cruzamento-8-mercados.md`.

---

## 5. Princípios de engenharia (do dono do projeto)

Estes são padrões de trabalho estabelecidos. Seguir:

- **Verificar, não confiar.** Tanto no código (validar entrada, tratar erro) quanto no produto (nunca afirmar dado não extraído).
- **Distinguir o verificado do assumido**, sempre — inclusive na UI: o resultado deve deixar claro o que foi lido da página vs. o que é inferência do guia.
- **pnpm**, não npm (se a stack usar Node).
- **Commits atômicos.**
- **Planejar antes de executar** (Option B: escrever plano → aprovar → executar). Antes de codar, produza um plano curto de implementação e a stack escolhida em `docs/DECISIONS.md`.
- **Sem sycophancy no código nem nos comentários** — comentários objetivos, código direto.
- Mensagens ao usuário final: claras, sem jargão, traduzíveis (toda string passa pelo i18n, nada hard-coded).

---

## 6. Requisitos de UI/UX (resumo — detalhe em SPEC.md)

- **Minimalista com identidade de moda.** Tipografia é o protagonista (um display font editorial + um corpo legível). Evitar cara de "ferramenta genérica de AI". Sem gradiente roxo em fundo branco.
- **Tela única, fluxo linear:** campo de URL em destaque → botão de análise → estado "analisando" com microanimação e os cards (placeholder de anúncio) → resultado.
- **Estado "analisando":** texto que rotaciona entre "Analisando / Comparando / Avaliando" no idioma ativo, com animação leve (CSS preferível). É aqui que os cards de anúncio aparecem.
- **Resultado:** veredito claro e escaneável — categoria detectada, nota/score, "amassa muito?", o que foi encontrado, o que falta, e o nível de confiança. Linguagem simples.
- **Responsivo e mobile-first** (a pessoa vai colar URL no celular dentro da loja).
- **Acessível:** contraste adequado, navegação por teclado, foco visível, `lang` correto por idioma.

> **Identidade implementada (2026-06-10):** estes requisitos foram concretizados no redesign **"Noir Couture"** — palco preto, tipografia creme, acento chartreuse, fontes Bodoni Moda + Inter + Space Mono, voz **Don Draper** (EN; PT/DE/ES adaptados), e o resultado apresentado como **etiqueta de composição**. Detalhe e racional em `docs/DECISIONS.md §5.4`.

---

## 7. Roadmap (orientação, não obrigação)

- **v1 (este escopo):** análise de URL única, 4 categorias, 4 idiomas, resultado honesto, cards placeholder. Sem login, sem banco.
- **Implementado pós-v1 (2026-06-07):** fallback de leitura via reader-proxy gratuito (r.jina.ai) quando o fetch direto é bloqueado (anti-bot por IP de datacenter) ou a página é JS-heavy. Renderiza JS a partir do IP do proxy e devolve texto; o parser lê só a seção do produto (`focusReaderText`) para não inventar dado de produto vizinho. Resolve **Zara** e lojas JS-heavy semelhantes. **Hollister** segue bloqueado (Akamai bloqueia também o proxy) → continua honestamente `unreadable`.
- **Futuro (não implementar agora):**
  - **Leitura avançada para lojas com anti-bot forte (Akamai/Shape) e SPAs pesadas:** navegador headless (Playwright/Puppeteer) ou proxy residencial. Cobriria Hollister, H&M e similares que bloqueiam tanto o fetch direto quanto o reader-proxy. Fora do v1 por custo (serviço pago) e limites do free tier do Vercel. Avaliar: Vercel + Browserless/ScrapingBee/Bright Data, ou função separada com `@sparticuz/chromium`. Manter o princípio de nunca inventar dado.
  - **Parser: reconhecer `egyptian` (Giza vs. genérico) e `modal` no `detectFiberType`** (`lib/parser/tokens.ts`) + tratá-las no `wrinkle`. Hoje (Fase 5) os valores existem no enum `FiberType` + `FIBER_QUALITY` + `PREMIUM_FIBERS` e são usados pela KB (selo de marca), mas o parser não os produz a partir do texto de páginas reais — então uma camisa egípcia/modal não-auditada não ganha crédito premium. Mexe no motor de leitura: exige fixtures reais e uma **regra anti-inflação** (distinguir "Giza certificado" de "algodão egípcio genérico" para não inflar veredictos). Trabalho isolado, separado dos commits de schema do Lote 3/5.
  - histórico, comparar 2 peças, ads reais, mais categorias, base de marcas expandida, modo "descobrir/comparar vários produtos".

  > **Ideias a explorar (sem detalhamento — só registradas para o futuro):**
  > - **Materiais além do algodão:** estender a verificação a jeans/denim, poliéster e outros tecidos (lã, linho, couro, sintéticos), cada um com seus próprios critérios de qualidade no guia/KB.
  > - **"Look do dia" (outfit of the day):** recomendação de combinação de peças.
  > - **"Fits me" / provador virtual:** gerar um avatar do usuário via IA e permitir vestir/visualizar o look online.

---

## 8. Definition of done da v1

> Status: **completo e em produção** — agora como **BAR Outfit** em https://baroutfit.vercel.app (rebrand/deploy 2026-06-14, com auto-deploy por push no `main`; o antigo https://roupas-khaki.vercel.app segue existindo). Detalhe e rastreabilidade em `docs/DECISIONS.md §5.4` e `§6`.

- [x] Stack escolhida e justificada em `docs/DECISIONS.md`.
- [x] `/api/analyze` lê uma página real e devolve JSON estruturado.
- [x] Parser cobre as 4 categorias e os tokens nos 4 idiomas (ver PARSER.md).
- [x] Nunca inventa GSM/fibra ausente; degrada confiança corretamente.
- [x] i18n funcionando com detecção por browser + seletor; nenhuma string hard-coded.
- [x] Estados de UI: input, analisando (com animação + cards placeholder), resultado, erro/"não foi possível ler".
- [x] Responsivo, acessível, deploy no Vercel free funcionando.
- [x] README com instruções de dev e deploy.

> Endurecimento pós-v1 (2026-06-14): guarda anti-SSRF + teto de corpo (anti-OOM) no leitor, rate limit por IP, headers de segurança/CSP, workflow de CI, e i18n sem strings hard-coded. Detalhe em `docs/DECISIONS.md §2` e `§5.4`.

> Pendências não-bloqueantes: revisão nativa do copy ES. (Nome final decidido em 2026-06-14: **BAR Outfit**, em `lib/brand.ts`.)
