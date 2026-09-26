# Kitchen Watcher — Launch Plan (source of truth)

Full plan with diagrams and chart: https://claude.ai/code/artifact/44660dde-2542-48f1-896e-e1d36110631c
Launch: 2026-10-01 (soft, ~25 pages). Organic only. Built and run with Claude Code.

## Positioning
Gear reviews + price watch (core) · smart kitchen & kitchen safety (differentiator) · price-alert tool + weekly newsletter (moat) · appliance-specific recipes (narrow top-of-funnel wedge).

| Pillar | Role | Revenue | Share yr 1 |
|---|---|---|---|
| Reviews / best / vs | Money pages | Affiliate | 40% |
| Smart kitchen + safety | Differentiator, high AOV | Affiliate, later ads | 20% |
| Deals + /watch/ tool | Retention, email | Affiliate, subs | 15% |
| Recipes | Top of funnel → gear pages | Ads later, internal links | 20% |
| Guides | Topical authority | Ads later | 5% |

## Launch clusters
1. **Air fryers** — /best/air-fryers/, 6 reviews, 2 vs, 4 recipes, 2 guides at launch.
2. **Kitchen safety devices** — /best/kitchen-safety-devices/, 3 reviews, 2 guides at launch.
3. Smart kitchen appliances — /best/smart-kitchen-appliances/ + 2 smart-oven reviews in October.
4. Espresso — Q1 2027. 5. Induction/cooktops — Q3 2027.

Keyword volumes are approximate (Ahrefs Keywords Explorer not available on this account). Verify in Ahrefs/GKP before each brief. Target long-tail: "{model} review", "{a} vs {b}", "best X under $N", "{model} price history", "air fryer {dish} {model}", "{model} error code".

## Brief rules
1. One primary keyword, 3–5 secondary, in frontmatter. Title ≤60 chars; year only on /best/ pages.
2. Answer in the first 60 words.
3. Comparison table with measured numbers on every review/guide.
4. ≥3 internal links out; linked from hub before publish.
5. Recipes: one appliance, one named model, "Made in" link, Recipe schema, real photos.

## Content schedule
| When | Pages | Ships |
|---|---|---|
| Sep 27–30 | 25 | Home, About, Authors, How-we-test, Disclosure, Privacy, Contact; air-fryer hub + 6 reviews + 2 vs + 4 recipes; safety hub + 3 reviews; 2 guides |
| Oct | 15 | 4 reviews, 2 vs, 3 recipes, 2 guides, smart-kitchen hub + 2 smart-oven reviews, first /deals/ |
| Nov | 12 | Deals hub + tool V1 by Nov 10; 6 /watch/ pages; 3 smart-kitchen reviews; 2 sub-guides (under $100, for two) |
| Dec | 8 | Gift guide, 3 recipes, 2 induction explainers, energy-use data study |
| After day 90 | 4–5/wk | 2 reviews, 1 guide/vs, 1 recipe, 1 deals refresh; refresh every money page at 6 months |

## Monetization order (gates, not dates)
1. Amazon Associates — day 1. Needs 3 qualifying sales in 180 days.
2. Impact / ShareASale / CJ / Awin brand programs — month 2, once 15 reviews live.
3. Price-watch tool V1 (free, 3 watches) — by Nov 10.
4. Tool Pro $3/mo or $24/yr — month 6, gate: 500 free users.
5. Raptive Rise / Mediavine Journey — gate: ~10k sessions/mo. Skip AdSense.
6. Newsletter sponsorship — gate: 2,000 subscribers.

## Price-watch tool
- V1: tracked products = products.json only. Daily capture via Amazon PA-API + 2–3 direct merchants (Worker cron). D1 `prices(product_id, merchant, price_cents, captured_at)`. `/watch/{slug}/`: 90-day line, all-time low, good-price/wait verdict vs median. Email alerts via Resend. Free tier 3 watches; separate newsletter opt-in checkbox.
- V2 (Q1 2027, only if 500+ users): Stripe Pro tier, category watches, CSV export.
- Every review embeds `<PriceWatch>`; drops auto-feed /deals/ and the newsletter.

## Newsletter — "The Watch List", Thursdays
5 price drops, 1 review, 1 recipe, 1 "don't buy". <400 words. `scripts/send-newsletter` drafts from D1 events + new content; human approves; Buttondown API sends. Targets: 500 subs by Dec, 2,000 by Jun 2027.

## SEO foundation (before first content page)
Cloudflare DNS/HTTPS, single canonical host, sitemap, robots allowing AI crawlers, GSC + Bing verified, IndexNow, CWV budgets in CI, self-hosted fonts, no third-party scripts, JSON-LD per layout, /how-we-test/, named author with photo + sameAs, disclosure above first affiliate link, orphan-page build check. Off-site: Pinterest/YouTube/Reddit/Instagram profiles; one data study per quarter for links.

## Gates
| Gate | Criteria | Target |
|---|---|---|
| Go live | 25 pages, CWV green, GSC verified | Oct 1 |
| Indexed | 50+ pages indexed, 10 in top 20 | end Mar 2027 |
| Traction | 3k sessions/mo, 500 tool users | ~Jun 2027 |
| Threshold | 10k sessions/mo, 2k subscribers | ~Sep 2027 |
Miss a gate → extend the phase. Never skip a gate for a date.

## KPIs (working targets; revise at month 3)
| KPI | M3 | M6 | M9 | M12 |
|---|---|---|---|---|
| Pages indexed | 50 | 110 | 170 | 230 |
| Keywords top 20 | 30 | 150 | 400 | 800 |
| Organic sessions/mo | 800 | 3,000 | 10,000 | 25,000 |
| Affiliate clicks/mo | 300 | 1,500 | 5,000 | 12,000 |
| Newsletter subs | 500 | 1,000 | 2,000 | 4,000 |
| Tool users free/Pro | 200/0 | 500/0 | 1,200/60 | 2,500/150 |

## Weekly cadence (~15 h human)
Mon GSC review + pick pages · Tue test + photograph · Wed publish 2 · Thu newsletter + deals · Fri recipe + vs + 5 outreach touches · Sat price refresh review · Monthly: refresh 5 oldest money pages, KPI table, decision memo.

## Risks
Sandbox 4–6 months (budget zero revenue to March) · reviews-system update (real testing only) · Associates 180-day rule (Black Friday timing, alt networks by month 2) · AI Overviews eat recipes (wedge only) · testing cost (buy 1–2/mo, brand loans after 15 reviews) · scraping ToS (PA-API only) · burnout (cut to 3 pages/wk before cutting testing).

## Open decisions
- Second cluster: kitchen safety (recommended) vs smart ovens.
- Buttondown vs Beehiiv.
- /watch/ pages noindex until 30 days of data (recommended) or index from day 1.
- Named author identity.
