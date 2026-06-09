# KNOWLEDGE-BASE.md — Guia de qualidade + marcas auditadas

> Esta é a base de conhecimento destilada de `rules/guia-qualidade-roupas-2026-v2.md` (o guia) e `guides/relatorio_final_marcas_guia_qualidade_2026.md` (o relatório). Em caso de dúvida ou divergência, esses dois arquivos são a fonte de verdade. Atualize esta base se o guia ou o relatório forem revisados.

## 1. Hierarquia de qualidade (ordem de prioridade na pontuação)

**fibra > tecido (tecelagem) > construção > gramatura (GSM) > marca**

Implicações para o parser/score:
- Uma fibra premium (Supima/Pima/ELS/merino/TENCEL) vale mais que GSM alto.
- "100% algodão" sozinho **não** prova qualidade — é sinal neutro.
- Marca é o último critério (ajuda a localizar, não substitui ficha).

## 2. Fibras — ranking

**Camiseta (tshirt), por objetivo:**
- Durabilidade/maciez: **Supima**
- Anti-amassado + anti-odor + térmico: **Merino**
- Custo-benefício premium: **Pima**
- Alternativa: **long staple cotton**
- Base: algodão comum

**Camisa (shirt) — fibras premium:** Supima, Pima, **TENCEL/Lyocell** (melhor natural anti-amassado).

**Fiação (bônus, todos):** Compact > Combed Ring-Spun > Ring-Spun > Open-End. (Fibra e fiação são eixos separados — não confundir.)

**Elastano (tshirt):** 0% naturalidade máxima; 2–5% bom equilíbrio (segura forma, amassa menos); >8% reduz durabilidade.

## 3. Faixas de GSM por categoria

### Camiseta (tshirt)
| Faixa | Qualidade |
|---|---|
| <150 | Básica |
| 160–180 | Boa |
| 180–220 | Premium |
| 220–300 | Heavyweight premium |

### Camisa (shirt)
| Faixa | Tipo |
|---|---|
| 110–130 | Leve |
| 130–160 | Excelente (social) |
| 160–180 | Premium (social) |
| 180–250 | Casual pesada |
| 250–400 | Overshirt |

> Camisa social ≠ overshirt. 270+ GSM é peça de outono/overshirt, não camisa social leve.

### Moletom (pullover)
| Faixa | Qualidade |
|---|---|
| <280 | Básico |
| 320–380 | Bom |
| 380–450 | Premium |
| 450–550 | Luxo |
Tecido ideal: **French Terry** (dura/veste melhor) > Heavyweight Fleece (aquece mais). Composição: 80–100% algodão.

### Hoodie
| Faixa | Qualidade |
|---|---|
| <300 | Básico |
| 350–420 | Bom |
| 420–550 | Premium |
Composição: 85–100% algodão = excelente; <80% = média. French Terry, 400+ GSM.

## 4. Tecelagens (shirt)
Ranking: **Twill** > **Oxford** > **Chambray** > **Poplin**. (TENCEL é fibra, não tecelagem — não misturar.)

## 5. Veredito anti-amassado (referência)
| Peça | Melhor opção que amassa pouco |
|---|---|
| T-shirt | Merino; ou Supima + elastano |
| Camisa | TENCEL; ou Twill Non-Iron* |
| Hoodie / Pullover | French Terry |

\* Non-Iron amassa pouco mas perde toque/respirabilidade e o efeito enfraquece com lavagens. TENCEL envelhece melhor (anti-amassado natural). Linho amassa MUITO mesmo sendo premium.

## 6. Sinais de etiqueta
**Excelente:** Supima, Pima, Long Staple, Merino, TENCEL/Lyocell, Combed, Ring-Spun, Compact, Twill, French Terry, Pre-Shrunk/Sanforized, corozo, mother-of-pearl, two-ply, loopwheeled.
**Neutro:** "100% cotton" sozinho.
**Atenção:** poliéster >40%; "premium"/"luxury cotton" sem dado; "Egyptian cotton" sem certificação (Giza 45/87).

## 7. Marcas auditadas (dados VERIFICADOS contra fonte oficial)

Use para complementar o que o parser extrair, quando a URL for de uma destas marcas. Todos os GSM abaixo foram confirmados em auditoria (ver `audit/revisao_relatorio_marcas_2026-06-06.md`) ou reconfirmados ao vivo na fonte oficial (lote 2026-06-07).

> **Origem dos dados / o que é fato vs. julgamento.** As linhas abaixo destilam duas fontes: o relatório original (`guides/relatorio_final_marcas_guia_qualidade_2026.md`) e os **cruzamentos por mercado** (`guides/cruzamentos/`), de onde saíram as 3 marcas novas do lote 2026-06-07 (Buck Mason, Maison Cornichon, ISTO.). O handoff técnico desse lote — com método de verificação por marca (web_fetch oficial vs. busca), ressalvas e a distinção fato/julgamento — está em `guides/cruzamentos/knowledge-base-candidatos-verificados.md`. Regra ao ler esta tabela: **`fibra`/`GSM`/`origem` são fato** (extraídos da fonte); **`tier` é julgamento editorial** (não é dado da marca); **`wrinkle` é inferência** da regra do guia (malha → low), salvo quando a própria marca declara. Espelho em código: `lib/knowledge/brands.ts` (manter os dois em sync).

| Marca / Produto | Categoria | Dados verificados | Wrinkle | Tier |
|---|---|---|---|---|
| Asket — The T-Shirt | tshirt | 100% organic long-staple cotton; 180 GSM; Portugal | low (malha) | A+ |
| Asket — The Overshirt | shirt/overshirt | 100% organic cotton; 308 GSM two-ply twill; corozo; Itália+Portugal | high (algodão puro plano) | S+ |
| Norse Projects — Heavy Loose Tee | tshirt | 100% organic cotton; 260 GSM; Portugal | low (malha) | S+ |
| Norse Projects — Falster | shirt | 50% cotton / 50% TENCEL; poplin; mother-of-pearl; Itália/Portugal | low (TENCEL) | S-/A+ |
| Norse Projects — Oxford BD | shirt | 100% organic cotton; oxford; mother-of-pearl; Portugal | high (algodão puro) | S |
| Norse Projects — Ulriken | shirt | cotton/linen twill; Manteco; corozo; Romênia (split 50/50 ou 75/25 a confirmar) | high (linho) | S-/A+ |
| Merz b. Schwanen — 215 | tshirt | 100% GOTS organic; loopwheeled (DE); ~244 g/m²* (ver ressalva) | low (malha) | S+ |
| Merz b. Schwanen — Worker's Twill | shirt | 100% organic cotton; 200 g/qm twill; corozo; Portugal | high (algodão puro plano) | S |
| SANVT — The Perfect | tshirt | ELS cotton; 185 GSM; ≥4 pontos/cm; **Portugal** | low (malha) | A+ |
| SANVT — Heavyweight | tshirt | 100% organic cotton; 235 GSM; **Portugal (fio fiado na Itália)** | low (malha) | A+ |
| Hollister — Boxy Heavyweight | tshirt | 100% cotton; 235 GSM; boxy (variantes washed 250 GSM) | low (malha) | A- |
| Vans — Premium Tee | tshirt | 100% cotton; sem GSM | low (malha) | B (parcial) |
| UNIQLO — Supima Tee | tshirt | 100% Supima; sem GSM | low (malha) | A (parcial) |
| **Buck Mason — Pima Classic Tee** | tshirt | 100% Supima cotton; 140 GSM; USA (Mohnton, PA) | low (malha) | A |
| **Buck Mason — Toughknit Tee** | tshirt | 100% Supima cotton; 200 GSM; USA (Mohnton, PA) | low (malha) | A+ |
| **Buck Mason — Field-Spec Heavy Tee** | tshirt | 100% cotton; 310 GSM; Import (não-EUA) | low (malha) | A+ |
| **Buck Mason — Slub Classic Tee** | tshirt | 100% cotton (slub); 145 GSM; USA (algodão cultivado nos EUA) | low (malha) | A |
| **Maison Cornichon — Côte 195g** | tshirt | 100% organic cotton (GOTS); 195 GSM; côte 1x1; França (Dordonha) | low (malha) | A+ |
| **Maison Cornichon — Jersey 290g** | tshirt | 100% organic cotton (GOTS); 290 GSM; jersey pesado; França | low (marca: "se froisse peu") | S |
| **ISTO. — Supima T-Shirt** | tshirt | 100% Supima ELS cotton; 160 GSM; pre-shrunk; Portugal | low (malha) | A+ |
| **ISTO. — Oxford Shirt** | shirt | 100% organic cotton (GOTS); 175 GSM; oxford; Portugal | high | A+ |
| **ISTO. — Lightweight Flannel** | shirt | 100% organic cotton (GOTS); 140 GSM; flanela; Portugal | high | A |
| **ISTO. — Midweight Flannel** | shirt | 100% organic cotton (GOTS); 160 GSM; flanela; Portugal | high | A+ |
| **ISTO. — Checked Flannel** | shirt | 100% organic cotton (GOTS); 200 GSM; flanela; botões bio-resina; Portugal | high | A+ |
| **Asphalte — Chemise Chambray** | shirt | 100% organic cotton; 155 GSM; chambray; Portugal | high | A+ |
| **Asphalte — Chemise Oxford (v4)** | shirt | 100% organic cotton; 150 GSM; oxford; França/Portugal | high | A+ |
| **American Giant — Classic Tee** | tshirt | 100% Supima (US-grown); 129 GSM (3.8 oz); USA | low (malha) | A |
| **American Giant — Slub Tee** | tshirt | 100% Supima (US-grown) slub; 207 GSM (6.1 oz); USA | low (malha) | A+ |
| **American Giant — Airy Supima Tee** | tshirt | 100% Supima (US-grown); 102 GSM (3 oz); USA | low (malha) | A- |
| **Finamore — Napoli 170 a due** | shirt | 100% Egyptian cotton Giza 45; sem GSM (norma camisa); poplin two-ply 170/2; madrepérola; feita à mão em Nápoles | high | S |

> \* **Ressalva Merz 215 (GSM):** a página oficial descreve a 215 como "midweight, 2-thread, loopwheeled" mas **não crava GSM em gramas**. O valor ~244 vem de conversão de "7.2 oz" de revendedor, e as fontes divergem (7.2 vs 8.6 oz). Manter como **referência aproximada**, não como GSM cravado pela marca. Composição/origem (100% organic, Made in Germany) são fato.

> Marcas com dados incompletos publicamente (Quiksilver, Zara, H&M, parte de Vans/UNIQLO/NN07): tratar como **partial** — confirmar sempre pela página/etiqueta, nunca assumir.

> **Pendentes (pesquisadas, ainda sem dado verificado — NÃO adicionar sem aprovação):** Scalpers/Silbon/Pompeii (ES), Community Clothing (UK), Hast (FR), camisa Dudalina/Aramis (BR, contagem de fios), luxo napolitano (Kiton/Borrelli/Zegna). Detalhe em cada `guides/cruzamentos/cruzamento-*.md`. *(Asphalte e American Giant saíram desta lista — integradas como `verified` no lote 2, 2026-06-07.)*
