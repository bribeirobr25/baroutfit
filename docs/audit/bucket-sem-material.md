# Evidência reproduzível — bucket "sem material" + classificação a/b/c/d (GO/NO-GO da Fase 1b P2.4)

> **Data do fetch:** 2026-06-17 · **Por quê:** o auditor (`AUDIT-P24-fase1b-nogo-2026-06-17.md`) endossou o NO-GO da 1b mas pediu **evidência reproduzível** — os URLs do bucket + a classificação por loja, anotando se o **JSON-LD realmente contém a fibra** (e não só nome/preço/imagem). Sem isso, o GO/NO-GO vivia só numa tabela-resumo. Este doc fecha a auditabilidade (princípio do projeto: evidência reproduzível, não só conclusão).
> **Fonte dos URLs:** mensagem do dono (lote de teste de ~35 URLs, bucket "Could NOT get the material data"). O dono notou que a composição existe mas atrás de expandíveis "Material/Composition/Fabric/Info/Details" carregados por JS.

## Como reproduzir
Fetch server-side do **HTML cru** (UA de browser, `redirect: follow`, timeout 14s) e classificação:
- **`ldFiber`**: algum nó `Product` do JSON-LD (`@type` Product/ProductGroup) tem a fibra nos campos que o nosso extrator lê (`name`/`description`/`material`/`category`/`additionalProperty`)? — espelha `collectFromProducts` em `lib/extract/index.ts`.
- **`island`**: algum `<script type="application/json">` / `#__NEXT_DATA__` contém a fibra?
- **`prose`**: a fibra aparece no texto visível (HTML sem `<script>`)?
- **`(d) headless`**: a fibra **não** está no HTML cru (carregada por JS/XHR).
- Regex de fibra: `\d{1,3}%\s*(cotton|baumwoll|polyester|elastane|viscose|modal|wool|linen|lyocell|tencel)` ou fibra nomeada (cotton/baumwolle/coton/algodão/polyester).
- **Caveat:** anti-bot é **não-determinístico** (IP/tempo); resultados são um ponto no tempo e a marcação/HTML das lojas muda. Adidas (403) e Ralph Lauren (307) bloquearam o fetch automatizado nesta rodada — coerente com a classe headless.

## Resultado (11 de 13 lojas, ao vivo em 2026-06-17)

| Loja | URL | ldFiber | island | prose | Classificação |
|---|---|:--:|:--:|:--:|---|
| Zara | `https://www.zara.com/de/en/relaxed-fit-interlock-t-shirt--04-p05584471.html` | n | n | n | **(d) headless** — fibra não no HTML cru |
| C&A | `https://www.c-and-a.com/eu/en/shop/t-shirt-2268114/2` | n | n | n | fibra no HTML cru mas em script **não-tipado/inline** (não JSON-LD, não island padrão, não prosa visível) → reader/headless ou 1a-visível; **não** é island-único |
| Weekday | `https://www.weekday.com/en-gb/p/men/basics/t-shirts/short-boxy-heavyweight-t-shirt-black-1228701001/` | **Y** | Y | Y | **1a cobre** (JSON-LD carrega a fibra); island **redundante** |
| Gap | `https://www.gap.com/browse/product.do?pid=891438052&vid=1&pcid=5225&cid=5225` | n | n | Y | **1a cobre** (prosa) |
| Lacoste | `https://www.lacoste.com/us/lacoste/men/clothing/t-shirts/TH7618-51.html?color=001` | **Y** | n | Y | **1a cobre** (JSON-LD + prosa) |
| Jack & Jones | `https://www.jackjones.com/de-de/product/12156101_176/normal-geschnitten-rundhals-t-shirt` | **Y** | n | Y | **1a cobre** (JSON-LD + prosa) |
| Farm Rio | `https://farmrio.com/products/brazilian-bodega-relaxed-t-shirt` | n | n | Y | **1a cobre** (prosa; Shopify) |
| Adidas | `https://www.adidas.de/collegiate-lineage-graphic-t-shirt/JM6415.html` | n | n | n | **(d) headless** (403 — bloqueado) |
| Armani (Emporio) | `https://www.armani.com/en-de/emporio-armani/heavy-jersey-t-shirt-with-embroidered-logo-cod-EM006809-AF13715-U5087/` | **Y** | Y | n | **1a cobre** (JSON-LD carrega a fibra); island **redundante** |
| Tommy Hilfiger | `https://de.tommy.com/t-shirt-aus-interlocksstrick-mit-logo-stickerei-mw0mw43227ybr` | **Y** | Y | Y | **1a cobre** (JSON-LD + prosa); island **redundante** |
| Ralph Lauren | `https://www.ralphlauren.de/en/wimbledon-big-fit-graphic-t-shirt-100091684.html` | n | n | n | **(d) headless** (307 — bloqueado/redirect) |

**Não re-fetchadas individualmente (2 de 13):** Banana Republic (`bananarepublic.gap.com/...pid=894457012`) — plataforma Gap → esperado **prosa (1a)** como o Gap; Armani EA7 (`armani.com/en-de/ea7/...`) — mesmo domínio do Armani → esperado **JSON-LD (1a)**. A decisão não depende delas.

## Conclusão (fecha a brecha lógica do auditor)
- **Nenhuma loja é "island-única".** As três que têm JSON island (Weekday, Armani, Tommy) **também** têm a fibra no **JSON-LD** (`ldFiber=Y`, campos que a 1a lê) — logo a 1a já cobre, e o island é **redundante**. A preocupação do auditor ("e se o JSON-LD for só nome/preço?") **não se concretiza** em nenhuma loja do bucket.
- **O gap real é (d) headless:** Zara, Adidas, Ralph Lauren — fibra carregada por JS/XHR, fora do HTML cru. Escopar JSON island **não** ajuda; **leitura headless** sim.
- **C&A** é o único caso ambíguo: a fibra está no HTML cru mas num script não-tipado/inline (não no JSON-LD, não num island `application/json` padrão, não na prosa visível) — não é um caso de island-único escopável; provavelmente recuperável pelo reader ou por um polish de cobertura, não pela 1b.

→ **NO-GO da 1b confirmado com evidência reproduzível.** Redireciona para: **headless** (gap real) e **polish de cobertura `visible-text`/proveniência da 1a** (ajuda casos prosa como Norse/Gap/FarmRio). Ver `docs/plans/P2.4-proveniencia-por-campo.md §1b.0`.
