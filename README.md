# BAR Outfit

Public, shareable landing page where anyone pastes a clothing-product URL
(t-shirt, button shirt, sweatshirt, or hoodie). A serverless function reads the
page, extracts the fabric facts, scores them against a quality guide, and returns
an honest verdict: quality band, "does it wrinkle?", what was found, what's
missing, and a confidence level. It then suggests audited pieces it trusts in the
same category, shows the product photo (proxied same-origin), and lets you share
the verdict as a link that unfurls into a generated card.

**Core principle: the app never invents data.** If GSM is not on the page, the
result says "not informed" — it does not guess. Honesty about gaps is the
product's credibility. See `CLAUDE.md` and `docs/` for the full spec.

## Stack

- **Next.js (App Router) + TypeScript** — single page + `/api/analyze` Route
  Handler (server-side proxy, solves CORS).
- **cheerio** — lightweight HTML extraction (no headless browser; free-tier
  friendly).
- **Tailwind CSS v4** + `next/font` — **Space Grotesk** (display) + **Inter**
  (body) + **Space Mono** (data / labels).
- **GSAP** (scroll reveals + kinetic headline) and **Three.js** (the WebGL hero
  field). Both bundled and served same-origin, so the strict CSP is unchanged.
- **vitest** — parser unit tests with real-page fixtures.
- **pnpm** — package manager.

## Design & voice

"Atelier" (redesign 2026-06-15): a cinematic near-black studio, bone type, a warm
**vermilion → amber** signal. The hero breathes with a live WebGL "dye-in-fabric"
field; sections rise on scroll (GSAP); the verdict reads as a precise dark spec
dossier. Mobile-first, and all motion yields fully to `prefers-reduced-motion`.
Copy is written in a **Don Draper voice** — EN in the original tone; PT-BR / DE /
ES are cultural adaptations, not 1:1 translations.
Under the input, **example reads are localized per market** (EN → US/UK, PT-BR →
Brazil, DE → Germany, ES → Spain) — see `lib/examples.ts`.

Rationale and locked decisions: `docs/DECISIONS.md` (redesign logged in §5.4).

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

Live on **Vercel free tier** at **https://baroutfit.vercel.app**. The GitHub repo
is connected, so every push to `main` auto-deploys to production (or run `vercel`).
The analysis endpoint runs as a Node.js serverless function (needs cheerio + full
fetch control, so not Edge runtime).

## Reading blocked / JS-heavy shops

The direct server fetch is the fast path. When it is blocked (datacenter-IP
anti-bot) or thin (JS-heavy SPA), the app falls back to a free, keyless reader
proxy (`r.jina.ai`) that renders JS from its own IP and returns text. The parser
then reads only the product section so a neighbouring product's data can't leak
in. This makes shops like **Zara** readable. Set `JINA_API_KEY` (optional) for
higher rate limits.

Shops with Akamai/Shape-grade anti-bot (e.g. **Hollister**, some **H&M**) block
the proxy too — those stay honestly `unreadable`. Covering them needs a headless
browser or residential proxy (roadmap; out of free-tier scope).

## Reading only the product's own facts

Extraction is defensive so a page's noise never becomes a false finding: it drops
nav/footer, links, and related-product cards/carousels, reads JSON-LD only from
`Product` nodes, dedupes repeated composition, and ignores marketing prose
(e.g. "1% of the global cotton production" is not a 1% cotton composition). It
reports only what the product page actually states. See `docs/PARSER.md §4.1`.

## Security & hardening

Because `/api/analyze` fetches a user-supplied URL server-side, it is hardened:

- **SSRF guard** — rejects private/reserved IPs (incl. cloud metadata `169.254.169.254`),
  non-80/443 ports, and internal hostnames; resolves DNS and re-validates every
  redirect hop. Residual DNS-rebinding (TOCTOU) is documented, not closed.
- **Response-size cap** — bodies are read with a 4 MB ceiling (OOM guard).
- **Rate limit** — per-IP sliding window (30/min) → `429` + `Retry-After`. It is
  best-effort/in-memory; production-grade limiting should use Vercel Firewall/BotID.
- **Security headers** — CSP (`frame-ancestors 'none'`, `object-src 'none'`, scoped
  sources), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS (set in `next.config.ts`; dev relaxes script/connect for HMR).

No cookies, analytics, or personal data are collected; the only client storage is the
chosen language (`localStorage`). See `docs/DECISIONS.md §2` / `§5.4`.

## CI

`/.github/workflows/ci.yml` runs `lint`, `test`, and `build` on every push and PR
(pnpm + Node 22).

## Honest limitations

Data that shops never publish (e.g. GSM at Zara/H&M) cannot be invented — the app
returns `partial` / `indeterminate` and says so. It never guesses. See
`docs/DECISIONS.md §2` and `CLAUDE.md §7` (roadmap).

The quality engine only grades fibers it has real criteria for — cotton, merino,
and TENCEL/modal. For anything else (polyester, silk, linen, non-merino wool,
viscose) it returns `out-of-scope` ("we don't weigh this fibre yet") instead of
faking a verdict. The "will it wrinkle?" answer is still given. Adding real
criteria per fiber is Phase E on the roadmap. See `docs/plans/fase-a-abstencao.md`
and `docs/DECISIONS.md §5.4` (2026-06-15).
