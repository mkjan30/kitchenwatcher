---
description: Research the web for products and topics in a cluster, score them, and write the content queue
argument-hint: <cluster> [count]
---

Cluster: $1. Target count: ${2:-8} products.

Read CLAUDE.md and PLAN.md first. Then run this pipeline end to end without stopping to ask; write results to files and report at the end.

## 1. Collect candidates (use WebSearch + WebFetch)
Search at least these, for the cluster "$1":
- "best $1 2026", "best $1 under $100", "$1 reviews" — collect every model named on the first page of Wirecutter, Serious Eats, CNET, Tom's Guide, RTINGS, Good Housekeeping, Consumer Reports (whatever is public), Reddit r/airfryer or the matching subreddit, and YouTube result titles.
- Amazon Best Sellers page for the category; note rank and review count.
- "$1 recall", "$1 problems reddit" — collect known failure modes per model.
Record for each model: name, brand, price seen (USD), Amazon ASIN if visible in URL, number of sources that recommend it, Amazon review count, top 2 complaints, source URLs.

## 2. Score (0–100)
- 35 pts: number of trusted sources recommending it (cap at 5)
- 25 pts: Amazon review count (log scale, 10k = full marks)
- 20 pts: price tier fit for our audience ($60–$250 full marks; over $400 zero)
- 10 pts: release within last 24 months
- 10 pts: known controversy or complaint volume (more complaints = more to write about = more points)
Take the top ${2:-8}. Drop discontinued models.

## 3. Topics per product (long-tail only)
For each kept model, search "{model} review", "{model} vs", "{model} problems", "{model} recipes", "{model} how to clean". From the autocomplete-style patterns and Reddit thread titles, list:
- 1 review page
- up to 2 vs pairs (only pair models both in the kept list)
- up to 2 guide topics (error codes, cleaning, a named problem)
- up to 2 recipe topics that name the model
Mark each with an intent (commercial/informational) and a confidence (high/med/low) for "a new site can rank for this". No volume numbers; we can't verify them.

## 4. Write outputs
- `data/products.json`: append kept models (id = slugified name, name, brand, category = "$1", asin, merchants[] = plain product URLs found, price_seen_cents, sources[], complaints[], tested_on = null). Do not touch existing entries. Do not set last_price_cents.
- `content/queue.md`: one table per cluster, columns: priority · page type · target URL · primary keyword · secondary keywords · product_id(s) · source URLs · status (queued). Priority = product score, reviews before vs before guides before recipies.
- `content/research-log/{date}-$1.md`: every candidate considered with its score and why it was cut, plus every URL fetched. This is the audit trail.

## 5. Report
End with: the kept models in score order, the number of queued pages, and the three topics you're least sure about and why. Nothing else.
