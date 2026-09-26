# Kitchen Watcher — Claude Code operating rules

kitchenwatcher.com. Kitchen gear reviews + price watch. Organic-only. Launch 2026-10-01.
Read PLAN.md once per session before doing anything. It is the source of truth for scope and order.

## Stack (do not swap without asking)
- Astro 5, Content Collections, MDX. Zero client JS unless a component truly needs it.
- Cloudflare Pages (site), Workers + D1 + Cron (price-watch), R2 (original images).
- Resend (transactional), Buttondown (newsletter). Pagefind for site search.
- No CMS, no WordPress, no Tailwind plugins beyond typography. Plain CSS variables are fine.
- Deploy: push to `main`. Nothing else deploys.

## Repo layout
```
src/content/{reviews,best,vs,smart-kitchen,recipes,guides,deals}/*.mdx
src/content/config.ts        # zod schemas — enforce, never loosen
src/components/              # ProductCard ScoreBox PriceWatch RecipeCard AuthorBox AffiliateLink
src/layouts/                 # Review Guide Recipe Deals — each emits its JSON-LD
data/products.json           # canonical product registry (id, name, brand, category, asin, merchants[], last_price_cents, tested_on)
scripts/                     # new-post, lint-content, check-schema, refresh-prices, send-newsletter, ping-indexnow
workers/price-watch/         # scraper, D1 schema, alert sender
```

## URL rules
- `/reviews/{slug}/` `/best/{category}/` `/vs/{a}-vs-{b}/` `/smart-kitchen/{slug}/` `/deals/{yyyy-ww}/` `/watch/{product-slug}/` `/recipes/{appliance}/{slug}/` `/guides/{slug}/`
- One folder deep. Trailing slash. Lowercase, hyphens. Never change a published slug; add a redirect in `_redirects` if unavoidable.

## Content rules (every page)
- Frontmatter required: `title` (≤60 chars), `description` (≤155), `author` (must exist in `src/content/authors`), `published`, `updated`, `primary_keyword`, `secondary_keywords[]`, `draft`.
- Reviews additionally: `product_id` (must exist in products.json), `score` 1–10, `pros[]`, `cons[]`, `tested_on`, `test_duration_days`, `price_at_review_cents`, `verdict` (one sentence).
- Recipes additionally: `appliance`, `product_id` of the model used, `prep_min`, `cook_min`, `servings`, `ingredients[]`, `steps[]`. Emit `Recipe` schema.
- First 60 words answer the query directly. No "In this article we will…".
- Every review/guide has a table with measured numbers (seconds, °F, dB, grams, watts). Spec-sheet restatement is not a measurement.
- Minimum 3 internal links out. Page must be linked from its hub (`/best/{category}/`) before it leaves draft. Build fails on orphans.
- Recipes carry a "Made in" box linking to the model's review.
- Never publish a review of a product that has not been physically tested. If `tested_on` is missing, the page stays `draft: true`.
- Voice: first person, plain, specific. Say what broke. No superlatives without a number behind them.

## Affiliate rules
- All outbound merchant links go through `<AffiliateLink product_id merchant />`. It adds `rel="sponsored nofollow"`, the tag, and click tracking. Raw affiliate URLs in MDX fail lint.
- Disclosure sentence rendered above the first affiliate link on every page (layout handles it; do not remove).
- Ranking in `/best/` pages is by score, never by commission.
- No display ads until PLAN.md says the ad-network gate is met.

## Schema
- Review → Product + Review + Rating, author as Person with sameAs.
- /best/ → ItemList of Product. No fake aggregateRating.
- Recipe → Recipe (instructions, nutrition if known, video if present).
- Guide → Article (+ FAQPage only if an FAQ block exists).
- /deals/ and /watch/ → ItemList + Offer with priceValidUntil.
- Site-wide → Organization, WebSite+SearchAction, BreadcrumbList.
- `npm run check:schema` validates every built page; fix before commit.

## SEO/technical guardrails
- CWV budget in CI: LCP < 2.0 s, CLS < 0.05, INP < 200 ms (Lighthouse mobile). Fail the build if exceeded.
- Self-hosted fonts. No third-party scripts except the affiliate click handler.
- Images: `<Image>` with width/height set, AVIF/WebP, alt text required (lint).
- robots.txt allows Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot. Sitemap auto-generated.
- After every publish: `npm run ping:indexnow`.

## Workflow for a new page
1. `npm run new -- --type review --keyword "ninja af101 review"` scaffolds MDX with frontmatter from products.json.
2. Draft body from the brief in PLAN.md rules. Leave `draft: true`.
3. Human adds photos + measured numbers + score. Only then set `draft: false`.
4. `npm run lint:content && npm run check:schema && npm run build`.
5. Commit with message `content: {type} {slug}`. Push.

## Don't
- Don't add dependencies for what 20 lines can do.
- Don't create pages for keywords not in PLAN.md's cluster list without adding them there first.
- Don't touch `data/products.json` prices by hand; `scripts/refresh-prices` owns that field.
- Don't scrape Amazon HTML. PA-API only.
