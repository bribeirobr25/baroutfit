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

Use para complementar o que o parser extrair, quando a URL for de uma destas marcas. Todos os GSM abaixo foram confirmados em auditoria (ver `audit/revisao_relatorio_marcas_2026-06-06.md`).

| Marca / Produto | Categoria | Dados verificados | Wrinkle | Tier |
|---|---|---|---|---|
| Asket — The T-Shirt | tshirt | 100% organic long-staple cotton; 180 GSM; Portugal | low (malha) | A+ |
| Asket — The Overshirt | shirt/overshirt | 100% organic cotton; 308 GSM two-ply twill; corozo; Itália+Portugal | high (algodão puro plano) | S+ |
| Norse Projects — Heavy Loose Tee | tshirt | 100% organic cotton; 260 GSM; Portugal | low (malha) | S+ |
| Norse Projects — Falster | shirt | 50% cotton / 50% TENCEL; poplin; mother-of-pearl; Itália/Portugal | low (TENCEL) | S-/A+ |
| Norse Projects — Oxford BD | shirt | 100% organic cotton; oxford; mother-of-pearl; Portugal | high (algodão puro) | S |
| Norse Projects — Ulriken | shirt | cotton/linen twill; Manteco; corozo; Romênia (split 50/50 ou 75/25 a confirmar) | high (linho) | S-/A+ |
| Merz b. Schwanen — 215 | tshirt | 100% GOTS organic; loopwheeled (DE); ~244 g/m² (7.2oz, midweight); sem costura lateral | low (malha) | S+ |
| Merz b. Schwanen — Worker's Twill | shirt | 100% organic cotton; 200 g/qm twill; corozo; Portugal | high (algodão puro plano) | S |
| SANVT — The Perfect | tshirt | ELS cotton; 185 GSM; ≥4 pontos/cm | low (malha) | A+ |
| SANVT — Heavyweight | tshirt | 100% organic cotton; 235 GSM | low (malha) | A+ |
| Hollister — Boxy Heavyweight | tshirt | 100% cotton; 235 GSM; boxy (variantes washed 250 GSM) | low (malha) | A- |
| Vans — Premium Tee | tshirt | 100% cotton; sem GSM | low (malha) | B (parcial) |
| UNIQLO — Supima Tee | tshirt | 100% Supima; sem GSM | low (malha) | A (parcial) |

> Marcas com dados incompletos publicamente (Quiksilver, Zara, H&M, parte de Vans/UNIQLO/NN07): tratar como **partial** — confirmar sempre pela página/etiqueta, nunca assumir.
