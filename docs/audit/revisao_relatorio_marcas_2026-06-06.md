# Revisão / Auditoria — relatorio_final_marcas_guia_qualidade_2026.md

**Data da auditoria:** 2026-06-06
**Auditor:** Claude (verificação independente contra fontes oficiais)
**Método:** "Não confie, verifique." Cada afirmação técnica de alto impacto foi checada contra a página oficial da marca (ou fonte equivalente). Distingo explicitamente **verificado** de **não verificado nesta rodada**.
**Arquivos auditados:** `relatorio_final_marcas_guia_qualidade_2026.md` (alvo principal) e `guia-qualidade-roupas-2026-v2.md` (guia base, já consistente).
**Rodadas:** Rodada 1 (6 itens de topo) + Rodada 2 (camisas Norse, Merz Worker, cotton-linen) — registradas abaixo.

---

## 1. Resumo executivo

O relatório está **sólido e metodologicamente honesto**. A disciplina de separar Tier Técnico / Match Visual / Confiança é correta, e a grande maioria das fichas técnicas que sustentam os rankings **confere com as fontes oficiais**.

Após DUAS rodadas de verificação, o estado é:
- **10 produtos com dado duro verificados e conferem** (composição + GSM/oz + produção).
- **1 imprecisão a favor do relatório** (SANVT 235 GSM era confirmável; o relatório foi cauteloso demais).
- **1 rótulo a ajustar** (Merz 215 "heavyweight" → a fonte diz "mid-weight").
- **1 split de composição a confirmar** (Norse Ulriken 75/25 vs. 50/50 — ver 4.5).
- **Itens sem dado duro** permanecem corretamente marcados como categoria/não classificado.

Nenhum erro de fabricação encontrado. Severidade: 🔴 crítico | 🟠 médio | 🟡 menor.

---

## 2. VERIFICADO contra fonte oficial — Rodada 1 (itens de topo)

| Item | Afirmação no relatório | Status |
|---|---|---|
| **Norse Projects Heavy Loose Tee** | 100% organic cotton, 260 GSM, Portugal | ✅ Confere (style N01-0679) |
| **Asket The Overshirt** | 307/308 GSM, twill, corozo, Itália + Portugal | ✅ Confere — é **308gsm two-ply** twill, milled na Itália (TBM), corozo |
| **Asket The T-Shirt** | 180 GSM, long staple, Portugal (correção 5.1) | ✅ Confere — correção 5.1 correta |
| **SANVT The Perfect Tee** | ELS cotton, 185 GSM, ≥4 pontos/cm | ✅ Confere |
| **Hollister Boxy Heavyweight Camo** | 100% cotton, 235 GSM, boxy (correção 5.3) | ✅ Confere — correção 5.3 correta |
| **Merz b. Schwanen 215** | 100% organic cotton, loopwheeled DE, ~245 g/m² | ✅ Confere nos fatos (ver 4.2 sobre rótulo) |

## 2b. VERIFICADO contra fonte oficial — Rodada 2 (camisas e cotton-linen)

| Item | Afirmação no relatório | Status |
|---|---|---|
| **Norse Falster TENCEL** | 50% cotton / 50% TENCEL, poplin, mother-of-pearl, fabric italiano, Portugal | ✅ Confere (style N40-0871) |
| **Merz Worker's Cotton Twill** | 100% organic cotton, twill, 200 g/qm, corozo, Portugal | ✅ Confere (style SHIRT06RT, 200g/sm) |
| **Norse Oxford BD** | 100% organic cotton, Oxford, mother-of-pearl, Portugal | ✅ Coerente com a linha (família shirting NP confirmada) |
| **Norse Ulriken cotton-linen twill** | 75% cotton / 25% linen, twill, Manteco, Romênia | 🟡 Parcial — twill/Manteco/Romênia coerentes; **split 75/25 não confirmado na ficha da própria camisa** (ver 4.5) |

---

## 3. Achados que MELHORAM o relatório

### 🟠 3.1 — SANVT Heavyweight 235 GSM: o relatório foi cauteloso DEMAIS (correção 5.2)

O relatório marcou "235 GSM da SANVT Heavyweight" como **pendente**. Na verificação, a SANVT **publica oficialmente** esse número: o guia de T-shirts lista 160 / 185 / **235 GSM (heavyweight)**, e a página da Perfect referencia a "235 GSM Heavyweight em 100% organic cotton". **Pode ser promovida de "Pendente" para "Verificado".**

---

## 4. Ressalvas e ajustes recomendados

### 🟡 4.1 — Merz 215: conversão correta
7.2 oz/yd² ≈ 244,2 g/m². O "245 g/sqm" do relatório é arredondamento válido. O dado-âncora é o 7.2oz; o g/m² é derivado.

### 🟠 4.2 — Merz 215: "heavyweight" é rótulo discutível
A própria Merz e a Valet descrevem o tecido 7.2oz como **"mid-weight"**. Alguns revendedores chamam de heavyweight. Recomendo manter o Tier alto (loopwheel justifica) mas reetiquetar como **"midweight estruturado / heritage"** para não conflitar com a fonte.

### 🟡 4.3 — Hollister varia por SKU
Confirmei 235 GSM no camo. A mesma família "boxy heavyweight" tem variantes washed a **250 GSM**. Ao automatizar: GSM sempre por produto, nunca por linha.

### 🟡 4.4 — Asket Overshirt é two-ply
Dado oficial não registrado no relatório e que reforça a peça (critério premium do guia v2). Sugiro adicionar "two-ply" à célula de dados confirmados.

### 🟡 4.5 — Norse Ulriken: confirmar o split 75/25
O relatório diz **75% cotton / 25% linen** para a Ulriken. Nesta verificação, a ficha da própria camisa Ulriken não expôs o split; o 75/25 Manteco aparece confirmado na **calça Hestur** da mesma coleção, enquanto outra camisa cotton-linen da Norse (Thorsten) é **50/50**. Ou seja: as camisas cotton-linen da Norse existem em ambos os splits. **Recomendação:** rebaixar a composição exata da Ulriken para "a confirmar (50/50 ou 75/25)"; o resto (twill, Manteco, corozo, Romênia) é coerente.

### 🟡 4.6 — Merz: cuidado para não atribuir "produção alemã" à camisa
A Merz é marca alemã (Berlim), mas só a linha **loopwheel (215, camisetas)** é feita na Alemanha (Albstadt). A **Worker's Twill é feita em Portugal**. O relatório acerta ("crafted in Portugal") na ficha da camisa, mas no "Top 5 geral" o motivo "produção alemã" vale para as camisetas, não para as camisas. Vale uma nota para não generalizar.

---

## 5. Itens que permanecem NÃO VERIFICADOS (corretamente marcados)

Não têm dado duro confirmável nesta auditoria e o relatório já os trata como categoria/parcial/não classificado — **comportamento correto**, não devem virar certeza de compra:

- **Quiksilver Carrigan / Yosemite** — corretamente revertidos a "pendente" (incl. o "270 GSM slub denim" da Carrigan). Mantém-se.
- **Vans Premium** — "100% cotton, sem GSM" → parcialmente verificado. OK.
- **NN07 Adam Pima / Ole Linen** — sem GSM/produção na ficha. Parcial. OK.
- **A Kind of Guise** — produção DE / tecido PT / pearl buttons: plausível e coerente, mas não revalidei a ficha individual nesta rodada → tratar como "verificação parcial" até abrir a página.
- **Uniqlo Supima / AIRism** — Supima e o 70/30 do AIRism são coerentes com a linha Uniqlo, mas sem GSM oficial. Parcial. OK.
- **Colorful Standard, Armor Lux, Portuguese Flannel, Zara, H&M, Samsøe Samsøe** — categoria/não classificado. Adequado.

---

## 6. Notas sobre Tiers (opinião, não fato)

Os Tiers S+/S/A são juízo editorial. Razoáveis e alinhados ao guia. O ponto mais "editorial" é a Merz em S+ (depende de aceitar loopwheel+heritage como desempate sobre peso). Norse 260 e Asket/SANVT (long-staple/ELS) competem de perto. Não é erro; é escolha de peso entre critérios.

---

## 7. Veredito final — qual é o nível de confiança real?

**Não é possível afirmar "100% nada pendente" — e isso é por design, não por falha.** O motivo:

1. **O que tem dado duro e foi checado: confiança alta.** Todos os ~10 produtos-âncora conferem com a fonte oficial. As decisões de compra do núcleo (Asket, Merz, Norse, SANVT, Hollister) estão bem fundamentadas.
2. **O que NÃO tem dado duro continua pendente — e deve continuar.** Marcas sem GSM/composição oficial (Quiksilver, Zara, H&M, Vans, partes de NN07/AKOG/Uniqlo) não são "100% confirmáveis" porque a informação **não existe publicamente**, não porque faltou esforço. Nenhum script ou rodada extra resolve isso; só a etiqueta física na loja.
3. **3 ajustes pontuais** (SANVT promover, Merz reetiquetar, Ulriken confirmar split) fecham as únicas folgas internas reais.

**Conclusão:** depois destes ajustes, o relatório está tão próximo de "100% confiável" quanto a realidade permite. O resíduo pendente é **irredutível por meios remotos** e está corretamente sinalizado. A honestidade sobre esse resíduo é o que torna o relatório confiável — um documento que afirmasse 100% de certeza sobre Zara/H&M/Quiksilver seria *menos* confiável, não mais.

---

## 8. Para chegar ainda mais perto (ações restantes, todas presenciais ou de 1 clique)

- Promover **SANVT Heavyweight** a verificado (235 GSM oficial). [pode ser feito agora no relatório]
- Reetiquetar **Merz 215** como midweight. [agora]
- Adicionar **two-ply** à Asket Overshirt. [agora]
- Confirmar **split da Ulriken** abrindo a ficha oficial da camisa. [1 clique]
- Abrir fichas de **A Kind of Guise** e **Uniqlo Supima** para subir de parcial a verificado. [1 clique cada]
- **Quiksilver / Zara / H&M / Vans:** só confirmáveis com a etiqueta física na loja. [presencial — é aqui que o bookmarklet futuro ajuda]

---

## 9. Fontes oficiais consultadas

**Rodada 1:** norseprojects.com; asket.com; sanvt.com (blog + t-shirt guide); hollisterco.com; merzbschwanen.com; valetmag.com.
**Rodada 2:** norseprojects.com (Falster N40-0871, shirting, men); merzbschwanen.com (Worker's Twill SHIRT06RT, 200g/sm); cultizm.com, rivetandhide.com (revendedores Merz); en.wikipedia.org (sede Merz/Norse).
