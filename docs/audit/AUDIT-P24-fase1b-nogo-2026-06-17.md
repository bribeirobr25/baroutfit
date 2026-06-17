# Auditoria — NO-GO da Fase 1b (arquivamento) + redirecionamento para headless

> **Data:** 2026-06-17 · **Auditor:** revisor independente (chat). · **Lema:** não confiar, verificar — dentro do limite das ferramentas.
> **Objeto:** a decisão do Claude Code de **arquivar a Fase 1b** após executar o GO/NO-GO 1b.0 (mapear, no HTML cru das 11 lojas "sem material", onde a composição realmente vive), e a correção correspondente no `ROADMAP-engine-licoes.md`.
> **Método:** leitura dos docs atualizados (`P2.4 §1b.0`, `ROADMAP §7`) + verificação independente ao vivo de uma amostra. **Fronteira honesta registrada abaixo:** não pude re-rodar as 11 URLs (não tenho os URLs de produto exatos do bucket; várias lojas bloqueiam o browser).

---

## Veredito

**Concordo com o NO-GO e com o arquivamento da 1b.** A conclusão é sólida na lógica e **confirmada por mim no caso decisivo (Norse)**; o restante da tabela é um claim do Claude Code que **só pude amostrar**, não reproduzir inteiro. O redirecionamento (gap real = headless, não escopo de island) está correto e bem fundamentado. Registro a fronteira de verificação com transparência.

---

## ✅ Verificado independentemente

1. **Caso decisivo (Norse) — confirmado por mim ao vivo (rodada anterior + esta).** O `.json` real do Norse expõe a fibra em **prosa no `body_html`** ("heavyweight organic cotton"), **sem chave de material estruturada**. Isso valida diretamente "Norse → (c) prosa → 1a cobre, 1b não resolveria". **Era o caso mais importante**, porque era o que justificava a 1b no plano original — e ele cai. A lógica central do NO-GO (a composição que motivou a 1b não vive num JSON island escopável) está **empiricamente confirmada** no caso que importava.

2. **Categoria "anti-bot/headless" — corroborada incidentalmente.** Ao tentar validar Weekday ao vivo, recebi **"Access Denied"** ao browser automatizado — consistente com a classe que o roadmap atribui a headless (JS/XHR + anti-bot). Não contradiz o veredito; reforça que o gap real é headless.

3. **Documentos consistentes com o relato.** `P2.4 §1b.0` traz a tabela de evidências + o veredito NO-GO + 1b ARQUIVADA; o `ROADMAP §7/#P2-B` foi corrigido de "escopar island destrava os buckets difíceis" para "**headless** destrava; escopar island **não**". A moldura antiga (que eu não havia questionado antes) foi honestamente revertida.

---

## 🔒 Fronteira de verificação (o que NÃO pude reproduzir)

- **As 8 lojas do balde "raw-HTML coberto pela 1a"** (Gap, FarmRio, C&A, Lacoste, Jack&Jones, Weekday, Armani, Tommy) — **não re-rodei cada uma.** Motivos concretos: (a) não tenho os **URLs de produto exatos** do bucket do dono (estão em sessões anteriores, não num doc do repo — busquei: não há um arquivo de URLs); (b) adivinhar URLs gera 404 (testei Armani/categoria → 404); (c) várias bloqueiam o browser (Weekday → Access Denied). Logo, **a classificação dessas 8 permanece um claim do Claude Code, por mim verificado só por amostragem (Norse) + a lógica.**
- **O ponto lógico mais frágil do NO-GO**, que eu quis testar e não consegui fechar: a afirmação "Weekday/Armani/Tommy têm JSON island **mas** também JSON-LD → 1a já cobre" só é verdadeira **se o JSON-LD dessas lojas contiver a composição** (muitos JSON-LD de moda têm só nome/preço/imagem, não a fibra). Se em alguma o island for a **única** fonte da fibra, a 1b teria, nessa loja, um nicho real. **Não pude confirmar nem refutar isso ao vivo** (anti-bot/URLs). Fica como a única brecha não-fechada — de baixo impacto, porque mesmo se existir, seria 1 loja, e o gap dominante (Zara/Adidas/Ralph Lauren) é inquestionavelmente headless.
- **Execução de testes/build/smoke** — não rodei (sem runner). Claims de runtime seguem do Claude Code.

---

## Por que concordo com o NO-GO apesar da fronteira

1. **A decisão é conservadora na direção certa.** Arquivar a 1b é **não construir** — não há risco de regressão; o pior caso de um falso-NO-GO é uma feature adiada, não um bug enviado. Isso inverte o ônus: para a 1b valer, seria preciso **provar** ≥1 loja tipo-(b)-único; na ausência dessa prova, não construir é o correto.
2. **O caso âncora caiu sob verificação real.** O Norse era a justificativa original e foi refutado ao vivo (por mim). Quando a premissa motivadora some, arquivar é a resposta honesta — exatamente a disciplina "reproduzir antes de construir", aplicada à própria motivação.
3. **O gap real é robusto e independente da tabela.** Zara/Adidas/Ralph Lauren serem JS/XHR-only (headless) não depende de nenhuma classificação fina das outras 8 — é a categoria que o roadmap já reconhecia. O redirecionamento para headless está certo mesmo que 1 das 8 fosse reclassificada.
4. **"Caught before a line of code" é o gate funcionando.** Mapear a premissa antes de construir é precisamente o que o gate existe para fazer. O Claude Code aplicou o A-workflow à **premissa**, não só ao código — maturidade.

---

## Observações / o que eu pediria

- **Registrar os URLs do bucket no repo** (um `docs/audit/bucket-sem-material.md` com as 11 URLs exatas + a classificação a/b/c/d por loja). Hoje a evidência do GO/NO-GO vive só na tabela-resumo; sem as URLs, **nem eu nem um futuro auditor conseguem reproduzir** o mapeamento. Isso fecharia a minha fronteira de verificação e tornaria o NO-GO auditável de fato (princípio do próprio projeto: evidência reproduzível, não só conclusão).
- **A brecha lógica do JSON-LD-sem-composição** (acima): se for trivial, ao registrar as URLs, anotar por loja se o JSON-LD **contém a fibra** ou só nome/preço. Fecha o único ponto não-confirmado.
- **Os três redirecionamentos propostos são bons** e ordenados certo: (1) headless é o gap real (mas é fase cara — Playwright/`@sparticuz/chromium` ou proxy residencial; própria fase, pós-P2/P3, demanda provada); (2) **OPS-2 (carimbo de git-SHA)** é o item pequeno e barato que materializa M1+M5 — endosso fazer logo; (3) o polish de `visible-text` da 1a (dar proveniência à prosa fora do `PRODUCT_SELECTORS`, hoje caindo no blob com `source` ausente, como o Norse em prod) é o ganho honesto que **de fato** ajuda o caso Norse — melhor uso do esforço que a 1b teria consumido.

---

## Recomendação ao dono

1. **Aceitar o NO-GO / arquivamento da 1b.** Verifiquei o caso âncora (Norse) ao vivo e a lógica é conservadora-correta; a varredura completa das 11 é claim do Claude Code, amostrado, mas o veredito não depende dos pontos não-verificados.
2. **Pedir o registro das 11 URLs + classificação no repo** (fecha a auditabilidade; baixo custo).
3. **Próximos passos, na ordem que o Claude Code propôs:** OPS-2 (git-SHA, pequeno) → polish de `visible-text`/proveniência da 1a (ajuda o Norse de verdade) → headless como fase própria (cara, só com demanda provada). As Fases 2/3 do P2.4 (gsm/weave) seguem válidas e independentes, no padrão-adaptador da 1a, se/quando quiser estender proveniência.

> **Resumo:** NO-GO da 1b **endossado**. Confirmei o caso decisivo (Norse → prosa, não island) ao vivo; a tabela das outras 10 é claim do Claude Code que só amostrei (URLs do bucket não estão no repo; anti-bot/404 limitam a reprodução). A decisão é conservadora-correta (arquivar = não construir, sem risco), o gap real (headless) é robusto, e o redirecionamento é bom. Único pedido concreto: **gravar as URLs do bucket no repo** para tornar o GO/NO-GO reproduzível. Claims de runtime e a classificação fina de 8 lojas não verificados aqui.
