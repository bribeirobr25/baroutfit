# PENDING / Backlog — BAR Outfit (fabric-check)

> Registro de pendências, observações e itens a verificar, levantados em revisões do projeto.
> Convenção: 🔴 bloqueante · 🟠 relevante · 🟡 menor / polish · 🔵 verificação a fazer.
> Cada item diz o que é, por que importa, e o estado.

---

## Revisão de 2026-06-07 (Claude, pós-deploy v1)

Contexto: leitura completa de CLAUDE.md, README, AGENTS.md, docs/ e código (parser, extract, evaluate); validação da v1 ao vivo em https://roupas-khaki.vercel.app via chamadas reais à API. A v1 está sólida e fiel ao princípio "nunca inventar dados". Itens abaixo não bloqueiam o uso atual.

### 🟡 P-001 — Validação de formato de URL antes do fetch
- **O que:** uma entrada claramente inválida (`not-a-url`) retorna `unreadable / blocked` em vez de um erro de validação de formato. Verificado ao vivo na API.
- **Por que importa:** UX e clareza — o usuário que digita errado recebe a mesma mensagem de "loja bloqueou" que uma loja realmente bloqueada, o que confunde o diagnóstico. Também evita um fetch desnecessário.
- **Sugestão:** validar `http(s)://` + host plausível no cliente (SPEC §2 já prevê "validação de URL no cliente") e/ou no início do route handler, retornando um `message_key` específico (ex.: `input.error.invalid`) antes de tentar a rede.
- **Estado:** aberto. Baixo esforço.

### ✅ P-002 — Verificação visual dos estados da UI (analyzing / result / error) — RESOLVIDO (2026-06-14)
- **O que:** os 4 estados (input / analyzing / result / error) foram validados visualmente ao vivo via Docker MCP (desktop 1280px) no build de produção local, em EN e DE.
- **Resolução:** fluxo completo exercitado (exemplo clicável + URL digitada → analyzing → etiqueta de resultado com selo AUDITED + confiança; e URL bloqueada → erro honesto "No reading"/"Keine Lesung"). Hydration e fetch same-origin OK sob a CSP nova; **zero erro de console**. Render confere com SPEC §4 (ordem do resultado, verified vs. a-conferir). Detalhe em DECISIONS §5.4 (2026-06-14).

---

## Itens herdados (do relatório/auditoria de marcas — fora do app, mas relevantes para a knowledge base)

> Estes vêm da auditoria do relatório de marcas e afetam a precisão da `lib/knowledge/brands.ts` se/quando ela for expandida. Não são bugs do app.

### 🟡 P-003 — Norse Ulriken: split de composição a confirmar
- **O que:** a composição exata da Norse Ulriken (50/50 vs. 75/25 cotton/linen) ficou marcada como "a confirmar" na auditoria.
- **Por que importa:** se a knowledge base passar a usar esse dado para complementar resultados, ele precisa estar verificado (princípio do projeto). Hoje a tabela de marcas trata como referência, então o risco é baixo.
- **Estado:** aberto, baixa prioridade (confirmável em 1 clique na ficha oficial).

### 🔵 P-004 — Resíduo irredutível de cobertura (lojas sem dado público)
- **O que:** lojas como Hollister (Akamai), e dados como GSM em Zara/H&M, não são obteníveis por meios remotos. Já tratado honestamente como `unreadable` / `partial` / `indeterminate`.
- **Por que importa:** não é um bug a corrigir, é um limite a lembrar. Cobertura só aumentaria com headless/proxy residencial (roadmap, fora do free tier).
- **Estado:** documentado (DECISIONS §2, §5.4; README). Sem ação na v1.

---

## Notas
- Os itens P-003/P-004 são "lembretes", não defeitos do código. P-002 foi resolvido (2026-06-14, validação visual). P-001 segue a única pendência real de UX da v1 (o cliente já valida `http(s)` e mostra `input.errorInvalid` antes da rede; o route devolve 400 como rede de segurança).
- Atualizar este arquivo a cada revisão; mover itens concluídos para uma seção "Resolvidos" com data.
