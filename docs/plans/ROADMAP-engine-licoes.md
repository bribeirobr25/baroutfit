# Roadmap — lições aprendidas → planos de robustez do motor

> **Criado:** 2026-06-16 · Consolida TUDO que aprendemos (lote de ~35 URLs do dono + Fases A/B/#4/C) num conjunto pequeno de planos focados, em vez de consertos pontuais. Estrutura pelas 3 camadas que o dono nomeou: **coletar → analisar → mostrar**. Fio condutor: o princípio fundador (nunca inventar; distinguir verificado de assumido; honesto sobre lacunas) — quase todo bug foi uma violação disfarçada dele.

## 1. Inventário de lições (caso → sintoma → lição → camada)

| Caso (origem) | Sintoma | Lição | Camada |
|---|---|---|---|
| Poliéster → "low" (Fase A) | punia o que não sabe avaliar | ausência/incompetência ≠ ruim → **abster** | analisar |
| Orgânico inflando (A2) | rótulo de sustentabilidade virou qualidade | eixos separados | analisar |
| Premium auditado subavaliado (#4) | Giza/napolitano/modal não reconhecidos → banda baixa | **cobertura de reconhecimento** + proveniência (fato×julgamento) | analisar + mostrar |
| Tee jersey → "low" (Fase C) | malha default corroborava | ausência→julgamento (patch pontual) | analisar |
| `value<25`→"low" (non-iron shirt; Kiton/Borrelli reproduzidos) | score baixo (=ausência) virava "low" | **`low` exige evidência NEGATIVA** | analisar |
| **Bloqueados** (Hollister, H&M, Pull&Bear, Oakley, Abercrombie) | anti-bot; **não-determinístico** (eu li, dono não) | hard Akamai → headless/residencial; e o read é **probabilístico** → retry/confiança/cache | coletar |
| **Sem material** (Zara, C&A, Weekday, Gap, Lacoste, Jack&Jones, Banana R., FarmRio, Adidas, Armani, Tommy, Ralph L.) | composição via JS/acordeão/JSON embutido | **cobertura de extração**: JSON embutido (parcial), `__NUXT__`/SPA, acordeão-via-API, headless | coletar |
| **Sem imagem** (Superdry, Osklen, Banana R., Zalando) | reader descartava imagem; og ausente | **acumular sinais entre fontes/paths** (não either/or) | coletar |
| **Sem problema** (Neverless, North Face, G-Star, Esteem, **Hugo Boss**) | leem bem — mas Hugo Boss leu "low" | até os "ok" expõem o bug de score | analisar |

## 2. Princípios de design transversais (as meta-lições)
1. **Ausência ≠ julgamento.** Três estados sempre explícitos: evidência positiva / negativa / ausência. `low`/`high` exigem evidência nomeada; ausência → `indeterminate`/`out-of-scope`.
2. **Acumular, não substituir.** Um read = várias fontes (HTML direto: meta/JSON-LD/JSON embutido/texto/imagens; reader: texto/markdown) mescladas best-available **com proveniência** — não "escolher um path".
3. **Proveniência uniforme.** Todo dado/veredito carrega de onde veio: lido-da-página · parseado-de-JSON · verificado-por-nós · nossa-avaliação · inferido. Mostrar consistente.
4. **Confiança no READ.** Saber quão completo foi o read (composição? imagem? specs? ou fragmento?) → permite retry, cache só de reads bons, e dizer honestamente "leitura parcial".
5. **Reproduzir antes de consertar.** Todo conserto começa por um fixture que reproduz o sintoma (disciplina que de-riscou jersey e o `value<25`). **Inclui a fronteira de coleta/merge**, não só fibra/score: toda regra de "acumular não substituir" (#2) merece um teste que falha se um path voltar a descartar o sinal do outro (ver §6/M4).
6. **Disco ≠ deployado.** "Verificar, não confiar" e "distinguir verificado de assumido" valem para o **deploy**: teste verde local não diz o que o usuário recebe. Commits/deploys atômicos + smoke check ao vivo (ver §6/M1).

## 3. Os planos focados (workstreams)

### P1 — Modelo de evidência no scorer (ANALISAR) · ✅ **EXECUTADO + EM PROD**
`docs/plans/scorer-modelo-de-evidencia.md`. Cobre: poliéster/orgânico/jersey/`value<25`/non-iron/Kiton. Conserto-raiz: **`low` só por evidência negativa**; `nonIron`/jersey não corroboram qualidade. Enviado no lote `3a128ac` (2026-06-17).

### P2 — Extração: source-merge + proveniência + confiança-no-read (COLETAR) · **parcialmente executado** (`P2-extracao-source-merge.md`)
A "lição Superdry" generalizada para os buckets **sem material** e **sem imagem** — TODA a camada de coleta:
- **Source-merge:** acumular todos os sinais de todas as fontes/paths (já feito parcial: merge da imagem no reader; JSON embutido por chave-alvo; imagens og/twitter/link/json-ld-array). Generalizar para um modelo único com **proveniência por campo** (P2.4 — pendente; **reformulado pelo §7/L-C como mudança de forma do pipeline**, não rótulo).
- **Cobertura extra:** `<img>` de galeria (P2.2 ✅); imagem markdown do reader (✅); **spec-row `{name:"Material",value:…}` em JSON island (P2.3 ✅, 2026-06-17)**; `__NUXT__`/state SPA **adiado** (#P2-B — risco de vizinho).
- **Confiança no read (P2.1 ✅, 2026-06-17):** o contrato carrega `read: { via, got, complete }` — `via` direct/reader, `got` ⊂ {fiber,gsm,weave,image}, `complete` = fiber+gsm. **Retry** (#P2-A resolvido): 1 retry do direct só em falha **transitória** (5xx/blip de rede), nunca em timeout (orçamento gasto) nem 4xx (definitivo) → cabe em `maxDuration=30`. Consumido por P5 ("leitura parcial") e, no futuro, P3 (cachear só reads bons).
- **Pendente:** P2.4 (proveniência por campo) + a cobertura pesada de material (headless). Médio.

### P3 — Infra: cache + analytics + corpus-de-páginas-reais (= Fase C) · a redigir
A forma concreta da Fase C, que **consome** o sinal de confiança do P2: **cache de reads bons** (chave = URL, TTL), **analytics cookieless** (sem banner), e **alimentar o corpus com páginas reais** (robustez que compõe sozinha; conecta à disciplina "reproduzir antes de consertar"). Infra (Upstash/store) — endurece também o rate-limit in-memory atual.
- **Reframe (§6/M2):** o analytics aqui é também o **radar de regressão do motor** — registrar a distribuição de buckets por read (unreadable / sem-material / sem-imagem / ok) + o sinal de completude do P2.1, para que uma queda (ex.: taxa de imagens despencando após um deploy) seja detectada **sem** depender da auditoria manual de URLs do dono.

### P4 — Cobertura de reconhecimento (ANALISAR na origem) · = Fase E
Reconhecer **Giza/egípcio, modal, e multi-fibra** (denim oz, lã micron, seda momme, linho) no parser, com regra anti-inflação (Giza certificado × egípcio genérico). Resolve a subavaliação na ORIGEM e encolhe a abstenção. Maior; guiado por demanda (Fase D).

### P5 — Proveniência uniforme na UI (MOSTRAR) · pequeno · **parcialmente executado**
Generalizar o bloco #4 (fato "verificado na fonte" × julgamento "nossa avaliação") para rotular toda a UI por proveniência, incl. "leitura parcial". **Depende de P2** carregar a proveniência por campo + o sinal de confiança no contrato; por isso vem depois (ou no fim) de P2, não "junto" de forma solta.
- **Item adicional (§6/M3):** **empty-states honestos** — ✅ **feito (2026-06-17):** sem imagem → o card mostra "No photo came through." (i18n nos 4 idiomas) em vez de silêncio. **Pendente:** rótulos de proveniência por campo (lido-da-página × inferido × reader) — dependem do P2.4.

## 4. Sequência recomendada e dependências
1. **P1 (scorer evidence model)** — raiz do bug recorrente; pequeno, **independente de tudo**. **Agora.**
2. **P2 (extração: source-merge + cobertura + confiança-no-read + proveniência por campo)** — antes de qualquer fonte pesada; absorve os buckets "sem material/sem imagem" e produz os sinais que P5/P3 consomem.
3. **P5 (proveniência na UI)** — logo após P2 (consome o que P2 carrega no contrato).
4. **P3 (Fase C: cache + analytics + corpus-real)** — quando instrumentar; consome o sinal de confiança do P2; analytics-first p/ a Fase D não ser cega.
5. **P4 (reconhecimento/Fase E)** — depois que a Fase D (usuários reais) mostrar qual fibra/categoria priorizar.
6. **Headless/residencial** (bucket "bloqueados" duro) — só depois de P2/P3, custo pago, demanda provada.

> **Por que P1 antes de P2:** são independentes, mas P1 conserta um bug de credibilidade ATIVO (Kiton "low"); P2 dá mais dado ao scorer já corrigido. Consertar o juízo antes de alimentá-lo melhor.

## 5. Cross-cutting (não-código ou infra)
- **Fase C** (infra: cache/analytics cookieless) — materializa P3; analytics-first para a Fase D não ser cega.
- **Fase D** (validar com usuários) — pode começar já, em paralelo; define a prioridade de P4.

## 6. Meta-lições de operação (episódio "imagens não aparecem", 2026-06-17)

> O bug que o dono viu em produção **não estava em nenhum arquivo do disco** — estava no fato de que o disco ≠ o deploy. Localmente as imagens populavam (Norse 2, Superdry 5); em prod, não. Causa: o A2 reader-merge + P2.2 + a migração `image`→`images[]` estavam corretos e **verdes no disco, mas não commitados** → produção rodava o contrato antigo (o ramo do reader em `fetchPage` descartava a `og:image` do direct). Investigar isso ensinou 4 lições que vivem **ao redor** do motor (deploy, observabilidade, empty-states, testes de fronteira) — nenhuma estava neste roadmap. Não substituem o "entender Superdry de forma holística": isso **já está feito** (lição #2 = acumular-não-substituir; Superdry é uma instância, não um caso especial).

**M1 — Disco ≠ deployado.** Teste verde local não diz o que o usuário recebe. O princípio fundador estende-se ao deploy: distinguir **o que está no disco** do **que está em produção**. É também um desvio do CLAUDE.md §5 ("commits atômicos") — empilhamos uma migração grande não-commitada. *Conserto (barato):* commits/deploys menores e atômicos + um **smoke check ao vivo** pós-deploy (ver OPS-1). Era exatamente a guarda que teria pego este bug.

**M2 — Observabilidade: hoje só achamos regressões pela auditoria manual de ~35 URLs do dono.** O motor não enxerga a própria distribuição de buckets (unreadable / sem-material / sem-imagem / ok). *Reframe do P3:* analytics não é só p/ a Fase D (produto) — é o **radar de regressão do motor**. O sinal de completude-do-read (P2.1) + log agregado cookieless = o sistema nos diz onde está fraco, em vez de o dono caçar. M2 torna M1 **detectável continuamente** (queda na taxa de imagens após um deploy = alarme).

**M3 — Empty-states honestos (camada MOSTRAR), não silêncio.** Galeria vazia hoje renderiza nada; mas o princípio p/ GSM ausente é "não informado", não silêncio. Ausência de imagem merece a mesma nota honesta ("não foi possível ler a foto"). *P5 ganha um item:* empty-state honesto p/ imagem/specs ausentes — P5 hoje só rotula dados que **existem** (proveniência), não a ausência.

**M4 — A fronteira de coleta/merge precisa da própria classe de teste.** O snapshot do corpus guarda o PARSER; nada guardava a seleção de path do `fetchPage` até o teste de repro deste episódio (`extract.test.ts` → "carries the direct og:image into the reader-path result"). Generaliza o princípio #5: testes de **integridade de path/merge**, não só fixtures de fibra/score.

**OPS-1 — smoke check pós-deploy** (materializa M1) · ✅ **feito (2026-06-17).** `scripts/smoke.mjs` (`pnpm smoke`) bate na prod com 1 página *direct* (Norse) + 1 *reader* (Superdry) e **falha (exit 1)** se `status != ok` ou `images` vazio. Aceita `BASE_URL`/arg para apontar a local/preview. Rodar após cada deploy (futuramente, step de CI pós-deploy). Foi a guarda que confirmou ao vivo o fix de imagens.

**Sequenciamento:** OPS-1 é quase de graça e **precede** o envio do trabalho de imagem não-commitado. M2/M3/M4 **não viram workstreams novos** — entram como itens nos P2/P3/P5 existentes (notas a baked-in quando executados).

## 7. Lições de arquitetura do motor (de EXECUTAR P2.1/P2.3/P5, 2026-06-17)

> Enquanto §6 é sobre o que vive **ao redor** do motor (deploy, observabilidade), §7 é sobre o **interior** dele — três lições que só apareceram ao *construir* os workstreams, cada uma verificada contra o código. Elas **reformulam** P2.4/#P2-B (não só acrescentam) e tocam direto no pedido do dono: "não só coletar, mas analisar e mostrar com precisão".

**L-A — A decisão direct-vs-reader usa um proxy grosseiro, e não usa o sinal que acabamos de construir.** `fetchPage` mantém o read direto só se `!thin && hasFabricSignal` — então um PDP **legitimamente curto** (descrição enxuta, mas composição em meta/JSON-LD) é empurrado para o reader (18s) **mesmo já tendo o dado**. (Sintoma concreto: os fixtures de teste do P2.1 caíam no reader até serem inflados além de 200 chars.) O `read.complete`/`got` (P2.1) é computado **na rota, depois** de o path já ter sido escolhido. *Conserto:* realimentar o sinal **na decisão** (pular o reader quando o read direto já está completo) e **na enriquecimento por campo** (ir ao reader para preencher um read direto **parcial**, ex.: tem fibra, falta GSM). Hoje o sinal é só reportado, não agido. **Pequeno, alto valor, disponível já.**

**L-B — A fronteira de segurança é ESCOPO, não técnica.** Implementar o spec-row (P2.3) tornou o #P2-B concreto: o `__NUXT__` não é arriscado por ser regex/blob — é arriscado por ser **catálogo-inteiro** (carrega produtos vizinhos). O JSON-LD é seguro porque o **escopamos ao nó `Product`** (`isProductType`); os JSON islands embutidos **não têm escopo nenhum**. *Reframe de TODA a cobertura de extração:* o investimento certo não é "mais truques de parsing" e sim **escopar qualquer fonte ao produto exibido** (casar o nó por handle/SKU/productID da URL). Feito isso, o bucket `__NUXT__` adiado vira **seguro de minerar**.

**L-C — A junção extração→parser é com perda, e é a razão-raiz de "mostrar resultados precisos" ser difícil.** A mais profunda. `extractText` devolve **um único `text` concatenado**; o parser re-regexa esse blob. Quando a análise roda, **a fonte de cada dado já se perdeu** — é exatamente por isso que proveniência-por-campo (P2.4) e rótulos honestos de fonte na UI seguem "pendentes". P2.4 **não é** rotular o que já existe; exige o extrator emitir **candidatos estruturados `{value, source, scope}`** que o parser consome, em vez de achatar tudo. Essa junção com perda é a razão estrutural de a gente vir consertando **sintoma a sintoma** (imagem Superdry, jersey, value<25).

**Como §7 reformula os planos:**
- **P2.4** deixa de ser "rótulos de proveniência na UI" e passa a ser **mudança de forma do pipeline** (extrator emite `{value, source, scope}`; parser consome candidatos). É o **maior alavancamento** — fica a montante tanto da análise correta quanto do display honesto (L-C).
- **#P2-B** deixa de ser "regex-em-blob: sim/não" e passa a ser **"escopar ao produto: sim"** (casar nó por handle/SKU). Isso é o que de fato destrava os buckets difíceis com segurança (L-B).
- **L-A** é um ganho pequeno e imediato dentro do P2.1 já entregue: realimentar `read.complete` na escolha de path + enriquecimento de read parcial.

---

> **Resumo:** P1 conserta o "analisar" (ausência≠julgamento). P2 conserta o "coletar" inteiro — source-merge + cobertura + **confiança-no-read** + proveniência por campo (Superdry é só uma instância). P5 conserta o "mostrar" (proveniência uniforme, depende de P2). P3/P4 são as Fases C/E com forma concreta (P3 consome o sinal de confiança do P2). **§6 (M1–M4 + OPS-1)** conserta o que está **ao redor** do motor: deploy, observabilidade, empty-states honestos e testes de fronteira. **§7 (L-A/L-B/L-C)** conserta o **interior**: realimentar o sinal de read na decisão (L-A), escopar fontes ao produto (L-B) e tirar a perda da junção extração→parser (L-C, a razão-raiz dos patches sintoma-a-sintoma). Tudo amarrado pelos 6 princípios transversais.
