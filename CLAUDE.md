# Kitchen Watcher — Claude Code operating rules

kitchenwatcher.com. Research-based kitchen gear reviews + price watch. Organic-only. Launch 2026-10-01.
We do NOT test products hands-on (decided 2026-09-27). Every claim is sourced; nothing implies first-hand use.
Read PLAN.md once per session before doing anything. It is the source of truth for scope and order.

## Stack (do not swap without asking)
- Astro 5, Content Collections, MDX. Zero client JS unless a component truly needs it.
- Cloudflare Workers static assets (site, `wrangler.jsonc`), Workers + D1 + Cron (price-watch), R2 (original images).
- Resend (transactional), Buttondown (newsletter). Pagefind for site search.
- No CMS, no WordPress, no Tailwind plugins beyond typography. Plain CSS variables are fine.
- Deploy: push to `main`. Nothing else deploys.

## Repo layout
```
src/content/{reviews,best,vs,smart-kitchen,recipes,guides,deals}/*.mdx
src/content/config.ts        # zod schemas — enforce, never loosen
src/components/              # ProductCard VerdictBox PriceWatch RecipeCard AuthorBox AffiliateLink
src/layouts/                 # Review Guide Recipe Deals — each emits its JSON-LD
data/products.json           # canonical product registry (id, name, brand, category, asin, merchants[], last_price_cents, tested_on)
scripts/                     # new-post, lint-content, check-schema, refresh-prices, send-newsletter, ping-indexnow
workers/price-watch/         # scraper, D1 schema, alert sender
```

## URL rules
- `/reviews/{slug}/` `/best/{category}/` `/vs/{a}-vs-{b}/` `/smart-kitchen/{slug}/` `/deals/{yyyy-ww}/` `/watch/{product-slug}/` `/recipes/{appliance}/{slug}/` `/guides/{slug}/`
- One folder deep. Trailing slash. Lowercase, hyphens. Never change a published slug; add a redirect in `_redirects` if unavoidable.

## Content rules (every page)
- Frontmatter required: `title` (≤60 chars), `description` (≤155), `author` (must exist in `src/content/authors`), `published`, `updated`, `primary_keyword`, `secondary_keywords[]`, `draft`. Live pages also need `sources[]`: ≥2 URLs actually read for this page.
- Reviews additionally: `product_id` (must exist in products.json), `pros[]`, `cons[]`, `verdict` (one sentence). No self-assigned score.
- Recipes are paused: a recipe needs someone to cook it. Don't draft or publish recipes until PLAN.md says otherwise. (Schema kept: `appliance`, `product_id`, `prep_min`, `cook_min`, `servings`, `ingredients[]`, `steps[]`, Recipe JSON-LD.)
- First 60 words answer the query directly. No "In this article we will…".
- Every review/guide has a comparison table. Each number in it is either a manufacturer spec (labeled "manufacturer spec") or a third-party measurement credited to its source with a link on the page. Never invent, estimate or average a number.
- Minimum 3 internal links out. Page must be linked from its hub (`/best/{category}/`) before it leaves draft. Build fails on orphans.
- Never state or imply hands-on use: no "I tested", "in my kitchen", "after two weeks of use", no invented anecdotes. Owner experiences are attributed ("owners on Reddit report…" with a link). Lint blocks common hands-on phrases on live pages.
- Every factual claim traces to a source on the page or in `sources[]`. Unconfirmed claims carry a `{/* VERIFY: … */}` comment; lint blocks live pages that still have one.
- Where sources disagree or evidence is thin, say so.
- Voice: first person, plain, specific. Say what fails and how often owners report it. No superlatives without a number behind them.

## Affiliate rules
- All outbound merchant links go through `<AffiliateLink product_id merchant />`. It adds `rel="sponsored nofollow"`, the tag, and click tracking. Raw affiliate URLs in MDX fail lint.
- Disclosure sentence rendered above the first affiliate link on every page (layout handles it; do not remove).
- Ranking in `/best/` pages is editorial, by weight of evidence (independent measurements, owner-report consistency, failures/recalls, price), in the order of the hub's `products[]`. Never by commission.
- No display ads until PLAN.md says the ad-network gate is met.

## Schema
- Review page → Article with `about` Product, author as Person with sameAs. No Review/Rating markup (we did not review first-hand). No fake aggregateRating.
- /best/ → ItemList of Product.
- Recipe → Recipe (instructions, nutrition if known, video if present).
- Guide → Article (+ FAQPage only if an FAQ block exists).
- /deals/ and /watch/ → ItemList + Offer with priceValidUntil.
- Site-wide → Organization, WebSite+SearchAction, BreadcrumbList.
- `npm run check:schema` validates every built page; fix before commit.

## SEO/technical guardrails
- CWV budget in CI: LCP < 2.0 s, CLS < 0.05, INP < 200 ms (Lighthouse mobile). Fail the build if exceeded.
- Self-hosted fonts. No third-party scripts except the affiliate click handler and Google Analytics 4 (G-3LK2ZJE7HN, owner-requested 2026-09-28; in `Base.astro`, disclosed on /privacy/). Keep GA advertising features and Google Signals off unless the privacy page is updated first.
- Images: `<Image>`/`<Picture>` with width/height set, AVIF/WebP, alt text required (lint). Only images we have rights to (manufacturer press kits whose terms allow editorial use, PA-API after Associates approval, our own). Every hero needs `hero_credit` (the owner) and must not be cropped or altered when press terms forbid it. Reviews may go live without a hero; the layout shows a line-art illustration until a licensed image exists.
- robots.txt allows Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot. Sitemap auto-generated.
- After every publish: `npm run ping:indexnow`.

## Research pipeline (automated)
- `/research <cluster> [n]` finds products and topics on the web, scores them, appends to `data/products.json`, writes `content/queue.md` and a research log. Every model needs a source URL; no source, no entry.
- `/produce [n]` drafts the next queued pages with web research per page. Spec numbers are labeled "manufacturer spec"; third-party numbers are credited and linked; anything not confirmed gets `{/* VERIFY: … */}`.
- Human step: open each source, confirm it still says what the page claims, clear VERIFY comments, add images we have rights to (own photos, manufacturer press kits, PA-API images), set `draft: false`.

## Workflow for a new page
1. `npm run new -- --type review --keyword "ninja af101 review"` scaffolds MDX with frontmatter from products.json.
2. Build the brief with the `seo-content-brief` skill, draft the body under PLAN.md brief rules, then review it with the `seo-content` skill and fix what it finds. Leave `draft: true`. (CLAUDE.md research rules win over any skill advice.)
3. Human verifies sources, clears VERIFY comments, adds images. Only then set `draft: false`.
4. `npm run build && npm run lint:content && npm run check:schema` (lint and schema read `dist/`).
5. Commit with message `content: {type} {slug}`. Push.

## Don't
- Don't add dependencies for what 20 lines can do.
- Don't create pages for keywords not in PLAN.md's cluster list without adding them there first.
- Don't touch `data/products.json` prices by hand; `scripts/refresh-prices` owns that field.
- Don't scrape Amazon HTML. PA-API only.
