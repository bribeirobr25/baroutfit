# Plano — Fase B: de crítico a conselheiro

> **Status:** ✅ **EXECUTADO** (2026-06-15) — escopo cheio (B1 + B2 fotos + B3 compartilhável). 105 testes verdes (+7 de `recommend`), build OK, validação visual (Docker MCP) em todos os estados. Registro em `docs/DECISIONS.md §5.4` (2026-06-15). · **Criado:** 2026-06-15 · **Modelo:** Option B (escrever → revisar → executar, CLAUDE.md §5).
>
> **Refinamentos de execução (pós-aprovação, aterrados no código):** (a) B2 **não exige afrouxar a CSP** — a imagem é servida same-origin via `/api/image`, então `img-src 'self'` já cobre; (b) B3 **não re-busca** a URL do usuário — a Share-URL **codifica o veredito já computado** em query params (`/share?...`), eliminando o vetor de SSRF/custo por crawler; a OG image (`/api/og`) lê os mesmos params; (c) a lógica de análise será extraída para `lib/analyze.ts` e reutilizada por `/api/analyze` (B1/B2 já entram aqui).
> Pré-requisito cumprido: Fase A em produção (o app parou de mentir). Fase B é a vitória de produto mais barata e alinhada — começa a dar valor com os dados que já temos.

## Objetivo

Quando o usuário analisa uma peça, mostrar **alternativas auditadas que confiamos na mesma categoria** — transformando o veredito de um diagnóstico isolado num conselho. Zero infraestrutura nova (a KB já está em código). Opcionalmente, tornar o resultado mais visual/compartilhável (fotos / imagem de compartilhamento), que é onde estão os trade-offs reais.

## Achados de código que moldam o plano (verificados 2026-06-15)

- A KB (`lib/knowledge/brands.ts`) tem **só `tshirt` e `shirt`** — **nenhum** `pullover`/`hoodie`, **nenhum** sintético. → Recomendações só existem para camiseta/camisa; hoodie/pullover/unknown/out-of-scope-em-categoria-desconhecida = **estado vazio gracioso** (não é bug, é honestidade sobre cobertura).
- `matchBrandByHost(host)` (`brands.ts:698`) devolve o `AuditedBrand` inteiro (produtos + `tier`). O `AuditedProduct` **não tem URL de produto** — só specs. As marcas têm `domains[]`. → Recomendação linka ao **domínio da marca**, não ao produto (afiliado/produto-level fica para depois).
- `tier` ∈ {S+, S, S-/A+, A+, A, A-, B+, B}. → preciso de um mapa de **rank** para ordenar "igual ou superior".
- A extração (`lib/extract/index.ts`) **não captura imagem** (só `og:title`). → Fotos exigem mudança de extração + contrato + rota proxy + CSP (ver B2). **Não é zero-infra.**
- CSP atual (`next.config.ts`): `img-src 'self' data:` → exibir imagem remota exige proxy `/api/image` (mantém CSP fechada, não vaza referrer).

---

## B1 — Recomendações da KB (o núcleo; zero infra; fazer já)

### B1.1 — Função pura na KB
Nova função em `lib/knowledge` (ex.: `recommend.ts`, reexportada por `index.ts`):
```
recommendAlternatives(category, opts: { excludeBrand?: string }): Recommendation[]
```
Regras:
- Só `tshirt`/`shirt`; qualquer outra categoria → `[]`.
- Coleta produtos da MESMA categoria em `AUDITED_BRANDS` com **rank de tier ≥ A-** (inclui A-, A, A+, S-/A+, S, S+; exclui B+/B, que são fracos/partial).
- **Exclui a marca do match** (`excludeBrand`) — não recomendar Asket ao analisar uma Asket.
- Ordena por rank de tier desc; **dedupe por marca** (um produto por casa, para variedade); **cap 3**.
- Mapeia para `Recommendation` com `url = "https://" + brand.domains[0]`.
- `TIER_ORDER = ["S+","S","S-/A+","A+","A","A-","B+","B"]` (rank = posição invertida). Testado.

### B1.2 — Contrato (`lib/types.ts`)
```
interface Recommendation {
  brand: string; product: string; category: Category; tier: string;
  fiber: string | null; gsm: number | null; wrinkle: Wrinkle; url: string;
}
```
`AnalyzeOk` ganha `recommendations: Recommendation[]` (array vazio quando não há). Documentar em SPEC §3.

### B1.3 — API (`app/api/analyze/route.ts`)
Calcular no route (mantém a KB server-side, cliente fino): `recommendAlternatives(parsed.category, { excludeBrand: brand?.name })` e incluir no JSON. Já temos o `brand` do `matchBrandByHost`.

### B1.4 — Enquadramento HONESTO (ponto de decisão #B1)
**Recomendado:** apresentar como **"peças auditadas que confiamos nesta categoria"**, NÃO como "melhores que a sua". Por quê: a banda computada (da página) e o `tier` editorial (da KB) são **escalas diferentes** — afirmar "superior" exigiria compará-las, o que não é honesto. "Confiamos nestas" é verdadeiro e evita o problema de escala. (Alternativa: "melhores que esta" só quando a peça analisada é uma marca auditada de tier inferior — mais complexo, menos honesto; não recomendo agora.)
- **Sinergia com a Fase A:** quando a peça é `out-of-scope` (ex.: camiseta de poliéster) MAS a categoria é `tshirt`/`shirt`, as recomendações **aparecem mesmo assim** → "não avaliamos essa fibra, mas aqui está o que confiamos em camiseta." A abstenção vira um momento construtivo, não um beco.

### B1.5 — UI (`components/ResultCard.tsx` ou novo `Recommendations.tsx`)
- Seção **visualmente distinta do veredito** (como o selo/ads exigem imparcialidade, DECISIONS §4): fora da "etiqueta" ou num bloco claramente separado, rotulada como sugestão, não como parte da análise.
- Cada item: `marca · produto`, selo de `tier`, linha `fibra · GSM · wrinkle`, link para o domínio da marca (`rel="noopener noreferrer"`, target blank).
- Só renderiza se `recommendations.length > 0`. Sem itens (hoodie/pullover/unknown) → **nada** (sem seção vazia) ou uma linha honesta "ainda não auditamos peças nesta categoria" (ponto de decisão #B2 — recomendo: nada, para não poluir).

### B1.6 — i18n
Chaves novas nos 4 dicionários (paridade por teste): `result.alsoConsider` (título da seção, ex. EN "Houses we trust here") e, se aplicável, `result.alsoConsiderNote`. Voz por idioma, sem travessões.

### B1.7 — Testes
`recommend.test.ts`: tshirt devolve top-tier ordenado e capado em 3; exclui a marca do match; dedupe por marca; pullover/hoodie/unknown → `[]`; out-of-scope-poliéster em categoria tshirt → ainda devolve recomendações de algodão. Atualizar o snapshot do corpus se o contrato entrar nele (entra — `AnalyzeOk` muda; mas o corpus testa `ParseResult`, não `AnalyzeOk`, então **não** muda — confirmar). Atualizar `route.test.ts` para o novo campo.

---

## B2 — Foto do produto (opcional; tem trade-offs reais) — PONTO DE DECISÃO #B3

Exige (não é zero-infra):
1. **Extração:** capturar `og:image` / `image` do JSON-LD `Product` em `lib/extract` → novo campo no `extract` e no contrato (`AnalyzeOk.image?: string`).
2. **Proxy `/api/image`:** rota que busca a imagem server-side e a serve same-origin (mantém `img-src 'self'`, não vaza referrer, respeita o guard anti-SSRF já existente). Sem proxy, seria preciso afrouxar a CSP para domínios externos (frágil) — **não recomendo**.
3. **CSP:** manter fechada graças ao proxy (só `img-src 'self' data:`, servida via `/api/image`).
4. **Direitos/estética:** exibir UMA imagem editorial (não galeria); hotlink de terceiro tem implicação de ToS — proxy + uma imagem é defensável. O "Noir Couture" é tipográfico de propósito; a foto entra como acento, sem roubar o protagonismo do veredito.
5. **Caveat reader-proxy:** quando a leitura vem do `r.jina.ai` (markdown), a imagem pode vir como URL markdown — a captura precisa cobrir os dois caminhos.

**Recomendação:** fazer **depois** do B1, como passo isolado, OU adiar. É o item de maior risco/custo da Fase B e o menor valor relativo (ver B3).

---

## B3 — Imagem de compartilhamento do VEREDITO (a alavanca real de viralidade) — PONTO DE DECISÃO #B4

A foto do produto deixa o resultado mais bonito, mas **não torna o resultado compartilhável**. O que viraliza (e liga à Fase D) é um **OG image do próprio veredito** (a "etiqueta" com a nota) e/ou uma **página de resultado com URL própria**. Em Next 16 isso é `ImageResponse` (geração dinâmica de OG). É um mini-projeto à parte, de maior alavancagem que B2.

**Recomendação:** considerar B3 **no lugar de** B2 se o objetivo é preparar a Fase D (validação com usuários). Decidir junto com o dono.

---

## Fora do escopo da Fase B
Links de afiliado e URL por produto (precisa de match por produto + dados de afiliado → futuro). Banco/cache/analytics → Fase C. Recomendações para hoodie/pullover/sintético → dependem de **expandir a KB** (curadoria auditada; trabalho separado, pode rodar em paralelo).

## Pontos de decisão para o dono/revisor
1. **#B1 — Enquadramento das recomendações:** ✅ recomendo "peças que confiamos nesta categoria" (honesto) vs. "melhores que a sua" (problema de escala).
2. **#B2 — Estado vazio (hoodie/pullover):** recomendo **não mostrar seção** vs. mostrar linha "ainda não auditamos esta categoria".
3. **#B3 — Foto do produto (B2):** incluir agora / adiar / nunca. Recomendo adiar (custo/CSP/direitos > valor relativo).
4. **#B4 — Imagem de compartilhamento (B3):** fazer no lugar das fotos? Recomendo sim **se** o foco é munição para a Fase D; senão adiar.
5. **Escopo committed agora:** recomendo **só B1** (zero infra, alto valor, alinhado à honestidade), com B2/B3 decididos depois.

## Ordem de execução (se aprovado B1)
1. KB: `recommend.ts` + `TIER_ORDER` + testes.
2. Contrato: `Recommendation` + `AnalyzeOk.recommendations`.
3. API: calcular no route.
4. UI: seção separada + i18n (4 idiomas).
5. Docs: SPEC §3, I18N, DECISIONS §5.4, este plano → executado.
6. `pnpm lint && test && build` + validação visual (Docker MCP): camiseta auditada (recs aparecem, exclui a própria marca), camiseta de poliéster out-of-scope (recs de algodão aparecem), hoodie (sem recs).
