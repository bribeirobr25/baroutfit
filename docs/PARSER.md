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
- **Fibra/tipo de fibra (peso maior):** premium (Supima/Pima/ELS/merino/TENCEL) > orgânico/long-staple > genérico.
- **Tecelagem adequada à categoria:** ex. twill/oxford numa shirt; french terry num moletom.
- **Construção:** cada sinal premium (corozo, two-ply, loopwheel, twin-needle, sanforizado) soma.
- **GSM dentro da faixa premium da categoria** (ver KB) soma; abaixo do mínimo, penaliza levemente.
- **Penalidade por sintético** alto sem motivo (poliéster > limiar do guia).

**Bands:**
- `high` — fibra boa confirmada + (tecelagem adequada ou GSM premium) + algum sinal de construção.
- `medium` — algodão comum confirmado, GSM ok, sem sinais premium.
- `low` — leve demais / muito sintético sem propósito / sinais fracos.
- `indeterminate` — **dado insuficiente** (ex.: "100% cotton" e nada mais). NÃO é nota baixa; o veredito deve dizer "faltam dados para concluir".

A UI deve sempre mostrar **o que sustentou o score** (findings verificados), nunca só o número.

## 6. Veredito de "amassa muito?" (`wrinkle`)

Objetivo central do dono. Regras:
- **low:** contém TENCEL/lyocell em proporção relevante; OU non-iron/wrinkle-free; OU malha (jersey/french terry/fleece) — malha amassa pouco por natureza; OU merino.
- **medium:** algodão + elastano (2–8%); algodão pesado estruturado.
- **high:** 100% algodão tecido plano (popeline/oxford/twill leve) sem tratamento; linho ou cotton-linen alto (linho amassa muito).
- **unknown:** sem dados de fibra/tecido suficientes.

Notas: linho = amassa muito (mesmo sendo premium). Tecido plano de algodão puro sem non-iron = amassa. Malha (camiseta/moletom) = amassa pouco. Use categoria + fibra + weave + nonIron juntos.

## 7. Degradação de confiança (`confidence`)

- **verified:** fibra e pelo menos um entre {GSM, tecelagem, construção} lidos da página.
- **partial:** fibra lida, mas faltam GSM e tecelagem (típico de Zara/H&M/Vans).
- **unreadable:** página não pôde ser lida (tratado antes, em SPEC §2/§3).

A confiança nunca deve ser inflada. Faltou dado → confiança cai → a UI mostra isso.

## 8. Casos de teste (mínimos — expandir)

O Claude Code deve criar fixtures a partir de páginas reais e validar:
- Asket T-Shirt → tshirt, organic long staple, 180 GSM, verified, wrinkle low (malha).
- Asket Overshirt → shirt/overshirt, 308 GSM two-ply twill, corozo, verified, wrinkle high (algodão puro plano).
- Norse Falster → shirt, 50/50 cotton/TENCEL, poplin, wrinkle low (TENCEL), verified.
- Hollister Boxy Heavyweight → tshirt, 100% cotton 235 GSM, verified, wrinkle low (malha), sem fibra premium.
- Uma página Zara/H&M sem GSM → partial, score indeterminate, wrinkle conforme fibra/weave.
- Uma URL que não abre / anti-bot → unreadable.

Ver `KNOWLEDGE-BASE.md` para os dados de referência dessas marcas.
