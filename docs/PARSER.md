# PARSER.md — Extração, classificação e pontuação

> Núcleo técnico. Leia junto com `KNOWLEDGE-BASE.md` (faixas e marcas) e `SPEC.md` (contrato da API).
> O parser recebe o **texto** extraído do HTML da página (composição, descrição, ficha técnica) e devolve a estrutura `findings` descrita em SPEC.md §3.

## 1. Pipeline

1. **Normalizar texto:** lowercase, remover acentos para matching (mas preservar o valor original para exibição), colapsar espaços. Atenção: manter números e símbolos `%`, `/`, `²`.
2. **Detectar categoria** (§3).
3. **Extrair tokens** (§4) — fibra, tipo de fibra, GSM, tecelagem, fiação, elastano/poliéster, non-iron, construção.
4. **Pontuar** contra o guia (§5).
5. **Veredito de amassado** (§6).
6. **Degradar confiança** conforme o que faltou (§7).

Todo matching deve ser **multi-idioma** (EN/PT-BR/DE/ES) — as lojas que o usuário vai colar estão nesses idiomas. As listas abaixo não são exaustivas; o Claude Code deve expandi-las com sinônimos óbvios e testá-las contra páginas reais.

## 2. Regra de ouro do parser

**Só marcar `verified: true` o que aparece explicitamente no texto.** Se não achou GSM, `gsm: null` e entra em `missing`. Nunca derivar GSM de "heavyweight"/"pesada" — isso é pista visual, não dado (registrar como dica fraca, não como valor). Nunca assumir fibra premium a partir de preço ou marca.

## 3. Detecção de categoria

Mapear palavras-chave por idioma. Se houver conflito ou nenhuma, `category: unknown` + `categoryConfidence: low` (o app ainda pode pontuar tecido genérico, mas avisa).

| Categoria | EN | PT-BR | DE | ES |
|---|---|---|---|---|
| **tshirt** | t-shirt, tee, crew neck tee | camiseta, básica, malha | T-Shirt, Shirt (com gola careca) | camiseta, playera |
| **shirt** | shirt, button-down, oxford shirt, overshirt | camisa, camisa social, overshirt | Hemd, Oberhemd, Überhemd | camisa |
| **pullover** | sweatshirt, crewneck sweat, pullover | moletom, blusão de moletom | Sweatshirt, Pullover | sudadera, jersey |
| **hoodie** | hoodie, hooded sweatshirt | moletom com capuz, capuz | Kapuzenpullover, Hoodie, Kapuzensweatshirt | sudadera con capucha |

Cuidado com ambiguidades: "Shirt" em alemão/inglês pode ser camiseta ou camisa. Usar pistas extra (botões/buttons/Knöpfe → shirt; gola careca/crew → tshirt).

## 4. Tokens a extrair (multi-idioma)

### 4.1 Fibra base / composição
Procurar padrões de composição com `%`: ex. `100% cotton`, `95% cotton 5% elastane`, `50% cotton 50% tencel`.

> **Robustez implementada (2026-06-07, pós-auditoria com lojas reais):**
> - **Rejeitar prosa.** Um `%` seguido de texto corrido não é composição. "1% **of the global** cotton production" (marketing da SANVT) NÃO vira `1% cotton` — se houver stopwords (of/the/global/de/da/und…) entre o `%` e a fibra, o match é descartado. Qualificadores reais (organic, ELS, combed, supima…) passam.
> - **Deduplicar.** O bloco de composição se repete na página (JSON-LD + visível + meta) → dedupe por fibra+%, para não exibir "100% cotton, 100% cotton, 100% cotton".
> - **Não inventar de produto vizinho.** A extração (em `lib/extract`) remove nav/footer, **links** (`<a>`), seções de relacionados e cards de produto (`product-card/tile/grid/slider/carousel`), e lê JSON-LD **apenas de nós `Product`** (ignora `BreadcrumbList`/categorias). Isso evita falsos achados como `weave: denim` vindo de um produto recomendado.
> - **Separar texto colado.** Espaços inseridos entre elementos de bloco para não juntar "35% cotton" + "Imported" → "cottonImported" (que quebraria a leitura da fibra).
- **algodão:** cotton (EN) / algodão (PT) / Baumwolle (DE) / algodón (ES)
- **linho:** linen / linho / Leinen / lino
- **poliéster:** polyester / poliéster / Polyester / poliéster
- **elastano:** elastane, spandex, lycra / elastano / Elasthan / elastano
- **lã:** wool / lã / Wolle / lana
- **viscose/lyocell/tencel:** viscose, lyocell, TENCEL, modal

### 4.2 Tipo de fibra (qualidade) — hierarquia do guia
Detectar e classificar (ver KNOWLEDGE-BASE §2):
- **merino** (wool merino / lã merino / Merinowolle / lana merino)
- **Supima**, **Pima** (geralmente escrito igual nos 4 idiomas)
- **extra-long staple / ELS**, **long staple** / fibra longa / langstapelig / fibra larga
- **TENCEL / Lyocell** (anti-amassado natural — relevante para o veredito de wrinkle)
- **organic cotton** / algodão orgânico / Bio-Baumwolle / algodón orgánico
- senão → **generic** (algodão comum)

### 4.3 Gramatura (GSM)
Regex para capturar número seguido de unidade, em qualquer dos formatos:
- `GSM`, `g/m²`, `g/m2`, `gsm`, `g/qm` (DE), `gr/m²`, `g/sqm`
- também **oz/yd²** / `oz` / `7.2oz` → **converter** para g/m² (1 oz/yd² ≈ 33.906 g/m²) e marcar como derivado-de-oz (ainda `verified: true`, pois o dado-âncora existe).
- Se não houver número com unidade → `gsm: null`, entra em `missing`. **Não** inferir de "heavyweight".

### 4.4 Tecelagem (weave) — para shirt e relevante em geral
- **twill** / sarja / Köper / sarga
- **oxford** (igual)
- **poplin / popeline** / popelina / Popeline
- **chambray**, **flannel/flanela/Flanell/franela**, **corduroy/veludo cotelê/Cord/pana**, **denim**
- **jersey** (malha — típico de tshirt), **french terry**, **fleece/felpa/moletom felpado**

### 4.5 Fiação (spinning) — bônus de qualidade
- **combed** / penteado / gekämmt / peinado
- **ring-spun** / fio penteado-torcido / ringgesponnen / hilado en anillos
- **compact / compact spun**
- **loopwheeled / loopwheel** (heritage — sinal forte de qualidade em tshirt)

### 4.6 Anti-amassado
- **non-iron / no-iron / wrinkle-free / wrinkle-resistant** / não passa / não amassa / bügelfrei, knitterfrei, bügelleicht (DE) / no plancha, antiarrugas (ES)

### 4.7 Construção (sinais premium)
- **corozo** (botão de tagua), **mother-of-pearl / madrepérola / Perlmutt / nácar**, **two-ply / dois cabos / zweifädig**, **twin-needle / costura dupla**, **gusset / triangle insert**, **pre-shrunk / sanforized / sanforizado**

## 5. Pontuação contra o guia

A pontuação produz `score.value` (0–100) e `score.band`. Use as faixas de GSM e a hierarquia de `KNOWLEDGE-BASE.md`, **por categoria**. Princípio do guia: **fibra > tecido > construção > GSM > marca**.

Esquema sugerido (o Claude Code pode refinar, mas mantenha a ordem de prioridade):
- **Fibra/tipo de fibra (peso maior):** premium (Supima/Pima/ELS/merino/TENCEL) > long-staple > genérico/orgânico.
- **Tecelagem adequada à categoria:** ex. twill/oxford numa shirt; french terry num moletom.
- **Construção:** cada sinal premium (corozo, two-ply, loopwheel, twin-needle, sanforizado) soma.
- **GSM dentro da faixa premium da categoria** (ver KB) soma; abaixo do mínimo, penaliza levemente.

**Bands:**
- `high` — fibra boa confirmada + (tecelagem adequada ou GSM premium) + algum sinal de construção.
- `medium` — algodão comum confirmado, GSM ok, sem sinais premium.
- `low` — **só com evidência NEGATIVA nomeada** (GSM leve declarado + fibra comum), nunca um score baixo por ausência de pontos (ver P1, 2026-06-16).
- `indeterminate` — **dado insuficiente** (ex.: "100% cotton" e nada mais). NÃO é nota baixa; o veredito deve dizer "faltam dados para concluir".
- `out-of-scope` — **fibra fora do nosso critério** (ver Fase A abaixo). A peça foi lida, mas a fibra dominante não é algodão/merino/TENCEL. Honestamente abstemo-nos em vez de fingir uma nota.

> **Refinamento implementado (2026-06-07):** o `indeterminate` é decidido por **corroboração**, não só por "100% cotton". Se NÃO houver nenhum entre {GSM, tecelagem, construção, non-iron, fiação premium}, a band é `indeterminate` — **mesmo com fibra premium** lida (fibra sozinha não basta para julgar; espelha a regra de confiança §7). `low` exige evidência negativa real (GSM leve com fibra comum, ou score muito baixo COM corroboração), nunca ausência de dado. (Bug corrigido após teste ao vivo: fibra boa sozinha dava `low`; agora dá `indeterminate` + `partial`.)

> **Fase A — abstenção honesta e fim da inflação por orgânico (2026-06-15):**
> - **`out-of-scope` (decidir pela COMPOSIÇÃO):** o motor só pontua o que tem critério real — **algodão (todos os tipos), merino e os celulósicos Lenzing (TENCEL/lyocell, modal)**. Toda outra fibra (poliéster, seda, linho, lã não-merino, viscose, poliamida, cashmere) é **reconhecida mas não graduada**. O escopo decide-se pela composição (que carrega essas fibras com `%`), **nunca** pelo `fiberType` (cego a não-algodão). Regra de blend: a peça é IN_SCOPE se a **soma das fibras in-scope ≥ 60%** (assim um blend de duas in-scope, ex. 50% algodão + 50% TENCEL, soma 100% e é graduado; já 50/50 algodão-poliéster abstém-se). Composição vazia (nenhuma fibra lida) **não** é abstenção → cai em `indeterminate`. Isto corrige o único caso em que o app **mentia com confiança**: poliéster alto antes virava `low`; agora abstém-se. O `wrinkle` continua sendo respondido (universal: poli ≥ 50% → low, linho → high, malha → low). Cada fibra que ganhar critério real no futuro (Fase E) **sai** da abstenção.
> - **Orgânico não é eixo de qualidade:** `organic` é rótulo de sustentabilidade/agronomia (pode ser fibra curta upland), graduado como base (= `generic`, qualidade 1), e **não** conta como "fibra boa". O comprimento de fibra (long-staple/ELS) e as fibras premium seguem como os drivers reais. Certificações (GOTS/OEKO-TEX/bluesign) são eixo eco/segurança — detecção como findings separados fica para fase futura.

> **P1 — modelo de evidência (2026-06-16, atualiza a corroboração de 2026-06-07):** `low` exige **evidência NEGATIVA nomeada** (`gsmQuality ≤ 1 && !goodFiber`); o catch-all `value < 25` foi **removido** (gerava "low" por ausência de pontos — ex.: Hugo Boss, Kiton, camisa non-iron). **Corroboração** (o que tira de `indeterminate`) = **GSM, weave informativo (≠ jersey), fiação premium, ou construção ≥ 2 tokens**. **NÃO corroboram:** `nonIron` (tratamento, 0 de value), `jersey` (malha default), e **1 token de construção isolado**. Sem corroboração → `indeterminate`; corroborado sem evidência negativa → `medium`. O `value` (0–100) segue exibido, mas não decide a banda.

A UI deve sempre mostrar **o que sustentou o score** (findings verificados), nunca só o número.

## 6. Veredito de "amassa muito?" (`wrinkle`)

Objetivo central do dono. Regras:
- **low:** contém TENCEL/lyocell em proporção relevante; OU non-iron/wrinkle-free; OU malha (jersey/french terry/fleece) — malha amassa pouco por natureza; OU merino; OU **sintético dominante (poliéster ≥ 50%)** — sintéticos resistem ao amassado [2026-06-07].
- **medium:** algodão + elastano (2–8%); algodão pesado estruturado.
- **high:** 100% algodão tecido plano (popeline/oxford/twill leve) sem tratamento; linho ou cotton-linen alto (linho amassa muito).
- **unknown:** sem dados de fibra/tecido suficientes.

Notas: linho = amassa muito (mesmo sendo premium). Tecido plano de algodão puro sem non-iron = amassa. Malha (camiseta/moletom) = amassa pouco. Use categoria + fibra + weave + nonIron juntos.

## 7. Degradação de confiança (`confidence`)

- **verified:** fibra e pelo menos um entre {GSM, tecelagem, construção} lidos da página.
- **partial:** fibra lida, mas faltam GSM e tecelagem (típico de Zara/H&M/Vans).
- **unreadable:** página não pôde ser lida (tratado antes, em SPEC §2/§3).

A confiança nunca deve ser inflada. Faltou dado → confiança cai → a UI mostra isso.

> **Refinamentos implementados (2026-06-07):**
> - **"Fibra" inclui o TIPO de fibra.** Saber `fiberType` (Supima/long-staple/etc.) conta como fibra lida mesmo sem a string de composição "NN% cotton" — algumas lojas (SANVT, Norse) declaram o tipo mas não a porcentagem. Sem isso, elas davam `partial` tendo GSM + tipo de fibra.
> - **Categoria: o slug da URL é autoritativo** quando conhecido (imune a ruído de nav/produtos relacionados); a detecção por texto é fallback. Detecção por texto é por contagem (um "hoodie" perdido não vence 276 "shirt").
> - **Texto do reader-proxy é afunilado** (`focusReaderText`, em `lib/extract`) para a seção do produto antes de extrair tokens, evitando falsos achados (ex.: "denim" de um produto relacionado). Ver DECISIONS §2.

## 8. Casos de teste (mínimos — expandir)

O Claude Code deve criar fixtures a partir de páginas reais e validar:
- Asket T-Shirt → tshirt, organic long staple, 180 GSM, verified, wrinkle low (malha).
- Asket Overshirt → shirt/overshirt, 308 GSM two-ply twill, corozo, verified, wrinkle high (algodão puro plano).
- Norse Falster → shirt, 50/50 cotton/TENCEL, poplin, wrinkle low (TENCEL), verified.
- Hollister Boxy Heavyweight → tshirt, 100% cotton 235 GSM, verified, wrinkle low (malha), sem fibra premium.
- Uma página Zara/H&M sem GSM → partial, score indeterminate, wrinkle conforme fibra/weave.
- Uma URL que não abre / anti-bot → unreadable.

Ver `KNOWLEDGE-BASE.md` para os dados de referência dessas marcas.
