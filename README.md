# roupas (working name — replaces `[NOME_DO_PROJETO]`)

Public, shareable landing page where anyone pastes a clothing-product URL
(t-shirt, button shirt, sweatshirt, or hoodie). A serverless function reads the
page, extracts the fabric facts, scores them against a quality guide, and returns
an honest verdict: quality band, "does it wrinkle?", what was found, what's
missing, and a confidence level.

**Core principle: the app never invents data.** If GSM is not on the page, the
result says "not informed" — it does not guess. Honesty about gaps is the
product's credibility. See `CLAUDE.md` and `docs/` for the full spec.

## Stack

- **Next.js (App Router) + TypeScript** — single page + `/api/analyze` Route
  Handler (server-side proxy, solves CORS).
- **cheerio** — lightweight HTML extraction (no headless browser; free-tier
  friendly).
- **Tailwind CSS v4** + `next/font` for editorial typography.
- **vitest** — parser unit tests with real-page fixtures.
- **pnpm** — package manager.

Rationale and locked decisions: `docs/DECISIONS.md`.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # run parser/API tests
pnpm test:watch   # watch mode
pnpm build        # production build
pnpm lint         # eslint
```

## Project structure

```
app/                  UI (single page) + states
app/api/analyze/      serverless analysis endpoint
lib/extract/          fetch + cheerio HTML -> text
lib/parser/           normalize, classify, extract tokens, score, wrinkle, confidence
lib/knowledge/        typed quality guide + audited brands (from docs/KNOWLEDGE-BASE.md)
lib/i18n/             EN / PT-BR / DE / ES dictionaries + provider
docs/                 spec, parser rules, knowledge base, i18n, decisions
```

## Deploy

Deployed on **Vercel free tier**. Push to the connected repo or run `vercel`.
The analysis endpoint runs as a Node.js serverless function (needs cheerio + full
fetch control, so not Edge runtime).

## Honest limitations

JS-heavy / SPA shops and anti-bot pages may not be readable server-side; data
that shops never publish (e.g. GSM at Zara/H&M) cannot be invented. In those
cases the app returns `unreadable` or `partial` and says so. See
`docs/DECISIONS.md §2`.
