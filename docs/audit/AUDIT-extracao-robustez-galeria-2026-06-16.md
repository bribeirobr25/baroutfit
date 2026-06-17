# Auditoria — Plano "Robustez de extração (imagens + JSON embutido) + score + galeria"

> **Data:** 2026-06-16 · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** `docs/plans/extracao-robustez-galeria.md` (proposto, aguardando OK).
> **Método:** leitura direta de `lib/extract/index.ts`, `lib/parser/evaluate.ts`, `app/api/image/route.ts`, `app/api/analyze/route.ts`, `lib/parser/__fixtures__/corpus.ts` e `lib/parser/__snapshots__/corpus.test.ts.snap`. Cada causa que o plano alega foi conferida contra o código **e contra a saída congelada do snapshot** (evidência verificada, não aritmética de cabeça).

---

## Veredito resumido

Plano **sólido, barato e fiel ao princípio** (A/B só expõem o que está literalmente no payload). As causas de **imagem** e **JSON embutido** estão **confirmadas no código** e os consertos (A/B) são corretos. **A causa do passo C (score "low") NÃO se reproduz no baseline atual** — e isso é o achado mais importante desta auditoria: **nem o plano nem (na versão anterior) esta auditoria tinham um fixture que produzisse "low" para um tee de algodão**. Antes de mexer no scorer, é preciso um fixture que reproduza o sintoma real (Hugo Boss/Gap). Há ainda três lacunas de especificação (rate-limit do `/api/image`; contrato `image`→`images`; `resolveImage` por candidato). Nenhuma bloqueia A/B; a do passo C **deve** ser resolvida antes de tocar `evaluate.ts`.

---

## ✅ Causas confirmadas no código (verificado, não inferido)

1. **Imagem perdida no caminho reader — CONFIRMADO.** `fetchViaReader` (`lib/extract/index.ts`) retorna `{ text, categoryHint, thin }` **sem campo `image`**. E `fetchPage`, quando o reader tem sinal de fibra, faz `return { ok: true, extract: reader }` — descartando o `direct.extract` (que pode ter `og:image`, como no Superdry). A correção A2 ("mesclar a imagem do direct no resultado do reader, zero rede extra") é **correta e barata**. (Obs.: a referência de linha do plano `:539-541` é aproximada; a lógica está na função `fetchPage` perto do fim do arquivo — a substância confere.)

2. **Composição em JSON embutido não lida — CONFIRMADO.** `jsonLdNodes` lê só nós `Product` de `script[type="application/ld+json"]`; não há varredura de `__NEXT_DATA__`/`__NUXT__`/`<script type="application/json">`. O alvo do passo B é real.

3. **`jsonLdNodes` coleta `images[]` mas devolve `images[0]` — CONFIRMADO.** A função monta um array `images` (via `pushImg`, que já cobre string/array/`{url}`) e retorna `image: images[0]`. O passo A1 (devolver o array) é uma mudança pequena e correta.

---

## ❌ Passo C — a causa alegada NÃO se reproduz no baseline (correção de uma análise anterior)

> **Nota de método:** a 1ª versão desta auditoria afirmou, por **aritmética de cabeça**, que um tee genérico daria `value ≈ 22 → low` via o catch-all `value < 25`. **Isso estava errado e é corrigido aqui** — agora contra a **saída congelada do snapshot** (`corpus.test.ts.snap`), que é evidência verificada. Registro a correção em vez de reescrever silenciosamente.

O que o **baseline congelado** mostra (fatos do `.snap`):
- **`zara-nogsm`** ("100% algodão", sem GSM, sem weave) → **`indeterminate`**, value 10. **Não** é "low". Como não há weave parseado, `hasCorroboration` já é falso → abstém. **O caso "tee de algodão simples sem GSM" já é honesto hoje.**
- **`cotton-elastane-tee`** (jersey, 200gsm) → **`medium`**, value 37.
- **`hollister-heavy`** (generic, 235gsm, sem weave) → **`medium`**, value 30.
- **NENHUM fixture do corpus inteiro produz `band: "low"`.** Os menores in-scope são `medium` em value 25 (`maison-cornichon`, `poly-blend-6040`).

**Conclusões (verificadas):**
1. A tese do plano — *"`jersey` entra como corroboração e empurra para low"* — **não se sustenta no baseline**: o único tee jersey com dado (`cotton-elastane-tee`) dá `medium` 37, e o tee sem dado (`zara-nogsm`) já dá `indeterminate`. **Não há "low" para um tee de algodão em lugar nenhum do corpus.**
2. Logo, **o sintoma relatado (Hugo Boss/Gap/Osklen = "low"/"Mostly marketing") não está reproduzido por nenhum fixture atual.** Sem reproduzir, não dá para afirmar a causa — nem o plano (jersey), nem a versão anterior desta auditoria (`value < 25`).
3. A mudança proposta (excluir `jersey` de `hasCorroboration`) tornaria o `cotton-elastane-tee` e similares **`indeterminate`** (perderia a única corroboração `weave`), o que **muda fixtures que hoje são `medium`** — um efeito colateral a auditar, não o conserto do sintoma.

**Recomendação (substitui a anterior):** **bloquear o passo C até existir um fixture que reproduza o "low" real.** Concretamente, no A0: adicionar ao corpus o **texto real** (ou equivalente fiel) das páginas Hugo Boss/Gap/Osklen que o dono viu como "low"/"Mostly marketing", rodar o snapshot, e **ler qual banda e qual ramo** efetivamente dispara. Só então desenhar o conserto de C — que pode nem ser "excluir jersey". Sem isso, a validação visual (re-rodar Hugo Boss) corre o risco de **não mudar nada** (se o sintoma vier de outro caminho — ex.: a composição nem é extraída e cai em `indeterminate`/`out-of-scope`, ou vem de um GSM leve real).

> Em uma frase: **o passo C está mal-diagnosticado nos dois lados.** O baseline prova que tee de algodão não dá "low" hoje; o caso que dá "low" precisa primeiro entrar no corpus para ser entendido.

---

## ⚠️ Lacunas de especificação (A/B — não bloqueiam, mas registrar)

### L1 — `/api/image` realmente NÃO tem rate-limit (confirmado) — e a galeria multiplica o risco.
`app/api/image/route.ts`: tem SSRF guard, cap de 8 MB, allow-list de content-type, cache agressivo — **mas nenhum rate-limit** (diferente de `/api/analyze`, que tem o sliding-window in-memory). A galeria (A3) transforma 1 request de imagem em **N por análise**. O plano propõe cap ≤ 4–5 + lazy-load — **correto** — mas deve deixar explícito que **endurecer o `/api/image` (rate-limit) é pré-requisito de subir a galeria para produção**, ou sair junto da Fase C. Cap + lazy-load reduzem, não eliminam, o vetor (alguém chama `/api/image` direto, fora da UI).

### L2 — contrato `image?: string` → `images?: string[]`: consumidores a migrar.
`route.ts` monta `...(fetched.extract.image ? { image } : {})`. O plano troca para `images`. **Migrar todos os consumidores do campo `image`** (`route.ts`, `ResultCard.tsx`, `types.ts`, e **`/api/og`** + **`/share`**, que usam a imagem para o card social). O plano cita o contrato mas **não lista `/api/og`** — esquecê-lo quebraria a imagem de compartilhamento (a alavanca da Fase D). Adicionar `/api/og` e `/share` à checklist.

### L3 — `extractText` deve resolver cada nova imagem a URL absoluta + filtrar não-web.
A1 amplia fontes (`twitter:image`, `<img srcset/data-src>`). `resolveImage` já faz isso para 1 imagem; o plano deve dizer que **cada** candidato da galeria passa por `resolveImage` (absolutiza + rejeita não-http(s)), e que `data:`/SVG inline não entram (evita N requests inúteis ao proxy).

---

## ✅ Pontos em que o plano já acerta (crédito)

- **B com extração por chave-alvo, não blob** — mitigação certa contra "composição do vizinho" (mesmo princípio do `collectFromProducts` no JSON-LD). Conservador (decisão #B) é o correto.
- **A0 (corpus) antes de C, com auditoria manual dos diffs** — a rede certa; esta auditoria só reforça que o A0 precisa **primeiro reproduzir o sintoma** (ver §C).
- **Honestidade preservada** — A/B só expõem o que está no payload; reader continua afunilado por `focusReaderText`.
- **Headless/residencial fora de escopo** — correto; Fase E, dependente da Fase D.

---

## 🔒 Fronteira de verificação (não checado aqui)

- Os **resultados ao vivo** que motivaram o plano (Superdry sem imagem; Gap/Armani sem composição; Hugo Boss/Gap/Osklen "low") foram **reportados pelo dono/Claude Code**. Verifiquei as **causas de imagem/JSON no código** e o **comportamento do scorer no snapshot congelado** — **não** re-executei as URLs ao vivo. O "low" relatado **não** aparece no corpus atual (ver §C): ou o texto real difere dos fixtures, ou a causa é outra. Confirmar com o texto real da página.
- Não executei testes nem build. As bandas/valores citados vêm do `.snap` versionado (saída congelada do próprio projeto), não de execução minha.

---

## Recomendações sobre os pontos de decisão

- **#A (galeria):** strip scroll-snap + cap ≤ 4 — **de acordo**. Adicionar L1 (rate-limit do `/api/image` como pré-req de produção) e L3 (resolveImage por candidato).
- **#B (JSON embutido):** chave-alvo conservador — **de acordo**.
- **#C (score):** **bloquear até reproduzir o sintoma.** Não excluir `jersey` nem mexer em `value < 25` antes de um fixture Hugo Boss/Gap real mostrar, no snapshot, qual banda/ramo dispara. O baseline atual **não tem nenhum tee "low"** — então "C conserta o low" é, hoje, não-verificável. Esta é a mudança mais importante ao plano.
- **#D (retry):** 1 retry — **de acordo**, barato. Cap de tempo total para não estourar `maxDuration=30` (direct 9s + reader 18s + retry).
- **Adição:** migrar contrato `image`→`images` cobrindo `/api/og` e `/share` (L2).

---

> **Resumo:** as partes A (imagens) e B (JSON embutido) estão bem diagnosticadas e são aprováveis com 3 ajustes de spec (L1–L3). O **passo C está mal-diagnosticado**: o baseline congelado prova que **nenhum tee de algodão dá "low" hoje** (o caso sem GSM já é `indeterminate`), então a causa do sintoma relatado **não está no corpus** — é preciso reproduzi-la com o texto real antes de tocar o scorer. Causas de imagem/JSON verificadas no código; bandas verificadas no `.snap`; resultados ao vivo são do dono/Claude Code, não desta auditoria. *(Esta versão corrige uma análise anterior que atribuía o "low" ao `value < 25` por aritmética de cabeça — agora corrigido contra o snapshot.)*
