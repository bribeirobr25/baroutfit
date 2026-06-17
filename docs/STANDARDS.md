# STANDARDS — BAR Outfit

> Base de engenharia do projeto. **Destila o que já provamos** (não inventa): consolida `CLAUDE.md §1/§5`, `docs/plans/ROADMAP-engine-licoes.md §2/§6/§7` e `docs/DECISIONS.md`. Referência prática (1–2 páginas), não política de empresa.
>
> **Regra de ouro:** um princípio só fica aqui se **muda uma decisão real no código** (ethos do #P2-B: não pagar custo antes da demanda). Quando um item parar de mapear decisões, remova-o — padrão que não guia, apodrece.
>
> **Gatilho de manutenção:** este doc é fonte de verdade e custa upkeep. **Revisitar quando a forma do pipeline mudar** (P2.4/L-C: candidatos `{value,source,scope}`) — A2/A4 deixam de descrever um blob e passam a descrever candidatos; alinhar os princípios ao código novo para não virarem ruído.
>
> Todo plano novo (`docs/plans/`) **abre citando** os princípios (§1) em que se apoia.

---

## 1. Princípios de arquitetura (invariantes)

**A1 — Nunca inventar dado, inclusive QUANTIDADE.** Três estados sempre explícitos: evidência positiva / negativa / **ausência**. `low`/`high` exigem evidência nomeada; ausência → `indeterminate`/`out-of-scope`. Cardinalidade também é dado: variantes de tamanho da mesma foto ≠ várias fotos (dedup por identidade). *Origem: §1, princ. #1/#7.*

**A2 — Acumular, não substituir; um único chokepoint de normalização.** Um read mescla sinais de todas as fontes/paths. Identidade, dedup e proveniência vivem em **um ponto compartilhado**, não reimplementados por path (a regressão "ainda 2" foi DRY violado entre direct e reader). *Origem: L-C / N3.*

**A3 — Escopar ao produto, não à página.** A fronteira de segurança anti-vizinho é **escopo**, não técnica. Coletar de nós escopados ao produto (JSON-LD `Product`; JSON island casado por handle/SKU), nunca da página/catálogo inteiro. Em dúvida, **excluir**. *Origem: L-B.*

**A4 — Proveniência é first-class; a junção extração→parser não pode perder.** Todo dado/veredito carrega de onde veio (lido-da-página · estruturado · verificado-por-nós · nossa-avaliação · inferido). O extrator não deve achatar tudo num blob antes de a análise rodar. *Origem: L-C.*

**A5 — Honestidade na UI: lacuna se diz, não se silencia.** GSM ausente = "não informado"; foto ausente = nota honesta; read incompleto = "leitura parcial". Nunca silêncio, nunca veredito de ausência. *Origem: M3, §1.*

**A6 — DDD leve + camadas agnósticas (não o apparatus pesado).** Manter a **linguagem ubíqua** (glossário do domínio) e a separação de camadas: **domínio** (`lib/parser`, `lib/knowledge` — TS puro, regras de qualidade) × **infraestrutura** (`lib/extract`, HTTP, proxy) × **apresentação** (UI, i18n). Lógica de domínio é **agnóstica de framework**; só o route handler e a UI tocam Next. *Sem* aggregates/repositories/domain-events — overkill para o tamanho.

**A7 — Degradação graciosa + retry limitado + falha honesta.** Fallback `direct → reader`; retry só em falha **transitória** dentro do teto (`maxDuration=30`); timeouts, caps de corpo, rate-limit. Bordas externas devolvem **Result tipado**, não exceção. Recuperação proporcional a um serverless stateless — *sem* circuit breakers/self-healing distribuído. *Origem: P2.1, error-handling.*

**A8 — Segurança por padrão.** SSRF guard re-validando cada hop de redirect; teto de corpo (OOM); rate-limit por IP; headers + CSP fechada; imagens via proxy **same-origin** (`img-src 'self'`); nenhum segredo no client. *Origem: hardening, DECISIONS §2.*

**A9 — Disco ≠ deployado; confie no harness só após assertá-lo.** Commits/deploys atômicos; smoke pós-deploy; matar servidor **por porta**; carimbo de versão (OPS-2) que todo check assere. *Origem: M1/M5.*

**A10 — Free-tier, sem headless, sem bloat.** Serverless, barato, cabe no free tier e em `maxDuration=30`; **nenhuma dependência nova sem justificativa documentada**. *Origem: DECISIONS.*

---

## 2. Padrões de código (convenções)

- **TypeScript strict.** Tipo de retorno explícito em funções exportadas; sem `any` vazando pelo contrato.
- **Sem hard-coding.** Toda string de usuário passa pelos dicionários i18n (4 locales, paridade testada); **valores de dado** (rótulos como "TENCEL") **não** são traduzidos. Thresholds/caps/timeouts = **constantes nomeadas**; KB/marcas/faixas de GSM = **dados**, não código.
- **DRY + Reusabilidade (com freio).** DRY sobre **conhecimento/lógica**, não similaridade incidental. Extrair utilitário compartilhado **no 2º uso**, não especulativamente (`safeFetch`, `dedupeImages` já compartilhados). Concern transversal → um módulo/chokepoint (A2). Abstração prematura também é custo.
- **Error-handling nas bordas.** `fetch`, `JSON.parse`, cheerio e afins **nunca lançam para cima** — devolvem Result tipado e degradam para `partial`/`indeterminate`/`unreadable`. Nunca preencher lacuna (A1).
- **SSR-safe.** `"use client"` só quando necessário; nada de `createPortal`/`document` em escopo de módulo ou render; portais só quando o estado está aberto (validado por teste de markup estático).
- **Comentários objetivos** (sem sycophancy), explicando o **porquê** do não-óbvio. **pnpm** only. **Commits atômicos.**

---

## 3. Guias de fluxo de trabalho (processo)

- **Option B:** planejar → aprovar → executar. Planos em `docs/plans/`, abrindo com os princípios (§1) que usam.
- **Reproduzir antes de consertar/construir:** um teste/fixture que **falha primeiro**. Inclui **testes de integridade de path/merge** (não só fibra/score).
- **Validação multimodal:** `pnpm test` + `lint` + `build` + **curl ao vivo** + **Docker MCP visual** (quando há UI). Meta: **0 erros de console**.
- **Pós-deploy:** `pnpm smoke`; matar servidores **por porta** (`lsof -ti:PORT | xargs kill`); assertar versão (OPS-2, quando existir).
- **Auditoria independente** antes de fases arriscadas (revisão contra o código antes de enviar).
- **Commit/push só quando pedido** pelo dono.

---

## 4. Conscientemente diferido (e por quê)

> Não é omissão — é decisão. Cada item sai daqui **quando a demanda real aparecer** (mesmo mecanismo da abstenção de fibras que sai uma a uma na Fase E).

- **Event-driven / fila / pub-sub.** Somos um serverless **stateless e síncrono** (req → resp): sem DB, sem fila, sem jobs, sem mensageria entre serviços. Um event bus hoje é arquitetura para um problema que não temos. *Revisitar* só se surgir um seam async real — o cache + ingestão de analytics do **P3/Fase C**, ou **headless rendering** futuro (onde um passo de Vercel Queues poderia caber).
- **DDD tático completo** (aggregates, repositories, domain events): overkill para o tamanho; as camadas leves do A6 bastam.
- **API pública versionada/“agnóstica” como produto** (REST canônico, versionamento, content negotiation): prematuro para **1 endpoint interno**; manter só a lógica de domínio agnóstica de framework (A6).
- **Recuperação distribuída** (circuit breakers, self-healing): não há estado persistente a recuperar; Vercel recicla instâncias. Degradação graciosa (A7) é o nível certo.
