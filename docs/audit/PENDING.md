# PENDING / Backlog — roupas (fabric-check)

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

### 🔵 P-002 — Verificação visual dos estados da UI (analyzing / result / error)
- **O que:** a home (estado input) foi validada visualmente ao vivo (desktop 1280px) e está fiel à identidade editorial. Os estados **analyzing**, **result** e **error/unreadable** NÃO foram validados visualmente nesta revisão.
- **Por que importa:** o contrato da API e a lógica estão confirmados, mas falta confirmar o render real desses estados (animação + cards placeholder; ordem de leitura do resultado conforme SPEC §4; diferenciação visual verified vs. a-conferir; mensagem honesta de erro).
- **Bloqueio na revisão:** o servidor de browser (Docker MCP) ficou intermitente (timeouts de ~4 min), impedindo a interação completa. A captura da home funcionou; o snapshot/interação não.
- **Sugestão:** reexecutar a verificação visual quando o MCP do Docker estiver estável (mobile 430px + desktop 1280px), cobrindo os 4 estados. O DECISIONS §5.4 menciona validação via Playwright em build de produção — confirmar que continua válido na URL pública.
- **Estado:** aberto, pendente de ferramenta estável.

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
- Os itens P-003/P-004 são "lembretes", não defeitos do código. P-001 e P-002 são as pendências reais da v1.
- Atualizar este arquivo a cada revisão; mover itens concluídos para uma seção "Resolvidos" com data.
