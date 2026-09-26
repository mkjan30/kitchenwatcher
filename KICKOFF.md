# Kickoff — first Claude Code session

## Setup (one time, in Terminal)
```bash
mkdir kitchenwatcher && cd kitchenwatcher
git init
# copy CLAUDE.md and PLAN.md into this folder
claude
```

## Paste this as the first prompt
```
Read CLAUDE.md and PLAN.md fully before doing anything.

Phase 0 — scaffold (today). Do these in order, commit after each, no extras:
1. `npm create astro@latest` (minimal, TypeScript strict) + @astrojs/mdx, @astrojs/sitemap, @astrojs/cloudflare adapter, pagefind. No UI framework.
2. src/content/config.ts with the zod schemas from CLAUDE.md for reviews, best, vs, smart-kitchen, recipes, guides, deals, authors. Strict — unknown keys fail.
3. data/products.json with an empty array and a JSON schema next to it.
4. Layouts Review, Guide, Recipe, Deals, each emitting the JSON-LD listed in CLAUDE.md. Base layout with Organization/WebSite/BreadcrumbList, self-hosted font, no third-party scripts.
5. Components: AffiliateLink (rel sponsored nofollow, reads merchant URL from products.json, disclosure once per page), AuthorBox, ScoreBox, ProductCard, RecipeCard, PriceWatch (static placeholder until the worker exists).
6. scripts/: new-post (scaffold MDX from type+keyword), lint-content (frontmatter, raw affiliate URLs, missing alt, orphan pages, ≥3 internal links), check-schema (validate built JSON-LD), ping-indexnow. Plain Node, no frameworks.
7. Static pages: /, /about/, /how-we-test/, /affiliate-disclosure/, /privacy/, /contact/, /authors/{slug}/ from the authors collection. Placeholder copy marked TODO.
8. robots.txt allowing Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot. _redirects file. 404 page.
9. GitHub Actions: build + lint + check-schema + Lighthouse CI mobile with the CWV budgets from CLAUDE.md. Fail on budget.
10. README with the publish loop from CLAUDE.md.

Then stop and give me: the exact Cloudflare Pages settings to connect this repo, and the list of TODOs I must fill by hand (author bio, photos, how-we-test copy).

Do not write any review, guide or recipe content in this session.
```

## Second session (after scaffold is deployed)
```
Read CLAUDE.md and PLAN.md. Populate data/products.json with the 6 air fryers and 3 kitchen-safety devices I list below (I'll paste them). Then scaffold, as draft: true, the 25 launch pages from PLAN.md's Sep 27–30 row, with full briefs in each file's frontmatter (primary/secondary keywords, the measurements I need to take, the comparison table columns). I will fill in test results and photos before any page leaves draft.
```

## Third session (Oct, week 2)
```
Read CLAUDE.md and PLAN.md. Build workers/price-watch: D1 schema, daily cron capture for products.json (Amazon PA-API if keys present, else skip Amazon and use the direct merchant URLs), /watch/{slug}/ pages reading D1 at build via a JSON export, and the alert sender via Resend. Free tier: 3 watches per email. Ship by Nov 10. Smallest thing that works.
```
