# Auditoria — A reflexão "lições sistêmicas" do Claude Code (collect → analyze → show)

> **Data:** 2026-06-16 · **Auditor:** revisor independente (chat), contra o código em disco.
> **Objeto:** a resposta do Claude Code à pergunta do dono "aprendemos algo digno de virar melhoria sistêmica no engine? (ex.: generalizar a lição do Superdry)".
> **Método:** leitura de `lib/parser/evaluate.ts`, `lib/parser/__fixtures__/corpus.ts`, `lib/parser/__snapshots__/corpus.test.ts.snap`. As afirmações verificáveis da reflexão foram conferidas contra a saída congelada do snapshot.

---

## Veredito resumido

A reflexão é **honesta, bem fundamentada e digna de virar trabalho**. Não superdimensiona: a tese central ("o engine repetidamente transformou *ausência de dado* em *julgamento confiante*") é **verdadeira e verificável no histórico de bugs**. E — o mais importante para confiar no Claude Code — ele **descreve com precisão a própria pendência que ainda não resolveu** (`value < 25` ainda late), em vez de alegar que está tudo fechado. Recomendo aceitar a tese e priorizar os itens #1 e #2 que ele propõe, com uma correção factual e duas ressalvas abaixo.

---

## ✅ A tese central — verificada como real (não retórica)

A reflexão diz: os quatro bugs (poliéster→low; orgânico inflado; jersey-tee→low; premium auditado subavaliado) **são um bug só** — o sistema não tinha uma noção explícita de três estados (evidência positiva / evidência negativa / ausência), e a *ausência* escorregava para um polo. **Confere com o histórico** (todos documentados nas auditorias anteriores). É um enquadramento correto, não uma narrativa pós-fato.

**Prova nova no snapshot:** o fix do jersey-tee **shipou e é honesto**. O fixture `hugoboss-jersey-tee` agora existe (reproduz o sintoma que o dono viu) e resolve para **`indeterminate`, value 22** — não "low". Ou seja, o passo C que a auditoria de extração havia **bloqueado** ("reproduza o sintoma antes de mexer") foi feito na ordem certa: reproduzir → corrigir. Crédito real.

---

## ⚠️ Correção factual à reflexão — o `value < 25` NÃO é só "ainda não reproduzido"; é uma dependência de ordem frágil

A reflexão diz: *"a regra value < 25 → low quase certamente ainda morde generic shirts (mesma classe, ainda não reproduzida)."* **Isso está certo, mas subdescreve o risco.** O snapshot mostra o mecanismo exato:

- `hugoboss-jersey-tee` e `generic-jersey-tee-nogsm` têm **`value: 22`** (que é `< 25`) e mesmo assim leem **`indeterminate`**.
- **Por quê:** no `evaluate.ts`, o ramo `!hasCorroboration → indeterminate` roda **antes** do ramo `value < 25 → low`. Sem GSM e com `jersey` excluído da corroboração, esses tees não têm corroboração → caem em `indeterminate` **e nunca chegam** ao teste `value < 25`.
- **Logo o "fix" do jersey não consertou o `value < 25`** — apenas garantiu que *este* caso específico seja interceptado antes. **A regra `value < 25 → low` continua intacta e ativa.** Qualquer peça com **uma** corroboração fraca (ex.: `nonIron`, ou 1 token de construção) + `value < 25` **pula** o guard de indeterminate e **bate em `low`**.

**Exemplo concreto não coberto pelo corpus:** uma camisa genérica de algodão, sem GSM, com `nonIron: true` (não-ferrar) → `hasCorroboration = true` (via nonIron) → `value` baixo (sem GSM, sem fibra premium) → provável `< 25` → **`low`**. Isso seria um "low" **falso** vindo da ausência de dado, exatamente o bug-classe que a Fase A deveria ter aposentado. **Não está reproduzido, mas é alcançável** — e a reflexão tem razão em apontá-lo, só que é mais "latente e alcançável" do que "talvez ainda morda".

> **Implicação:** o "evidence audit" que o Claude Code propõe como item #1 **não é opcional nem cosmético** — é o conserto da causa-raiz que os fixes pontuais só mascararam por ordem de execução. Endosso fortemente priorizá-lo.

---

## ✅ As quatro generalizações por camada — avaliação

1. **Analyze — modelo de evidência explícito (item #1, "evidence audit").** **Maior valor, endossado.** Auditar todo caminho onde *ausência* pode produzir banda não-`indeterminate`, e exigir **evidência nomeada** para `low`/`high` (aposentar limiares ad-hoc como `value < 25`). Isto converte "honesto sobre lacunas" de princípio aplicado caso-a-caso em **verdade por construção**. É o item que para o whack-a-mole. Ver a correção acima: é mais urgente do que a reflexão deixa transparecer.

2. **Collect — acumular fontes com proveniência, não substituir (a lição Superdry generalizada, item #2).** **Endossado, médio esforço.** O Superdry aconteceu porque o caminho reader **descartava** o que o fetch direto já tinha (a imagem). Modelar uma leitura como **muitas fontes contribuindo campos** (meta direto, JSON-LD, JSON embutido, texto visível, imagens; texto/markdown do reader), mescladas best-available **com proveniência**, mata a classe inteira "o dado estava lá, só não no caminho que guardamos". Correto fazer **antes** de adicionar mais fontes (headless etc.), para não empilhar mais num pipeline either/or.

3. **Collect — confiança na própria leitura ("read quality").** **Boa ideia, é a forma concreta da Fase C.** Hoje rastreamos confiança na *análise* (`verified`/`partial` — confirmado em `confidenceLevel`), mas **não na leitura** (não sabemos quando a página voltou thin/blocked/parcial). Um sinal de read-quality habilita (a) retry, (b) cachear só leituras boas, (c) dizer ao usuário "esta leitura foi parcial". Liga-se à não-determinismo que o dono observou (Hollister bloqueado para um, não para outro).

4. **Show — proveniência uniforme.** **Endossado.** Hoje a proveniência foi adicionada em pedaços (verified-from-page vs inferred; depois o bloco #4 com fato-vs-julgamento). Generalizar para que **todo dado e veredito** carregue uma proveniência consistente (lido-da-página · parseado-de-JSON · verificado-por-nós · nosso-julgamento · inferido) renderizada de forma uniforme torna o resultado confiável num relance. O bloco #4 já provou o padrão; falta generalizar.

---

## 🟡 Ressalvas / o que NÃO perder de vista

- **Não reescrever reflexivamente.** A própria reflexão diz isso, e está certa: os fixes pontuais entregaram valor real (o jersey-tee está honesto hoje). Os itens #1 e #2 são refactors de robustez **com causa-raiz comprovada**, não reescrita por estética. Manter o critério: cada um precisa de corpus/fixtures que provem o ganho, como a Fase A teve.
- **Onde isto encontra o roadmap (a reflexão acerta):** "recognition coverage" (Giza/egyptian/modal, multi-fibra) **é a Fase E** — cada fibra ensinada ao parser encolhe tanto o conjunto de abstenção quanto a subavaliação de auditadas. "Read-confidence + cache de leituras boas + alimentar o corpus com páginas reais" **é a Fase C**. Esse mapeamento está correto e é útil: dá ordem natural sem inventar fase nova.
- **O corpus atrasado em relação à realidade é o argumento mais forte da reflexão:** o sintoma "low" só virou reproduzível quando uma página real entrou no corpus. Isso justifica **fazer leituras reais fluírem de volta para o corpus de teste** — robustez que compõe sozinha. Endosso, com a cautela de privacidade/ToS já registrada (guardar specs destilados, não HTML bruto; DECISIONS §4).

---

## 🔒 Fronteira de verificação (não checado aqui)

- Verifiquei a **lógica e o snapshot congelado** (`value 22 → indeterminate` por ordem de ramo; jersey excluído da corroboração; `value < 25` ainda presente). **Não** executei a suíte nem re-rodei URLs ao vivo. As bandas/valores citados vêm do `.snap` versionado do projeto.
- O caso "camisa genérica + nonIron + value < 25 → low" é **derivado da leitura do código**, não reproduzido por um fixture — é uma previsão a confirmar criando o fixture (que é precisamente o que o item #1 deve fazer primeiro).

---

## Recomendação ao dono

1. **Aceitar a tese** — é correta e o Claude Code está sendo honesto sobre a própria pendência.
2. **Priorizar o item #1 (evidence audit)** como plano Option-B. Exigir que o A0 dele **comece criando o fixture "genérico + nonIron + value<25"** para reproduzir o `low` latente **antes** de mexer no scorer — mesmo rigor que destravou o jersey-tee. Sem isso, o `value < 25` continua uma mina latente.
3. **Sequenciar o item #2 (source-merge com proveniência) antes de adicionar fontes novas** (headless), para não empilhar num pipeline either/or.
4. **Tratar read-confidence + corpus-de-páginas-reais como a forma concreta da Fase C**, e recognition coverage como Fase E — como a reflexão propõe.

> **Resumo:** reflexão honesta e verificada. Único reparo factual: o `value < 25` não está "talvez latente" — está **comprovadamente ativo**, apenas mascarado pela ordem dos ramos no caso do jersey-tee; o evidence audit (item #1) é a correção de causa-raiz e deve começar reproduzindo esse `low` latente. Itens #2–#4 bem mapeados ao roadmap (C/E). Claims de runtime são do Claude Code, não desta auditoria.
