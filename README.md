# Kitchen Watcher

kitchenwatcher.com: kitchen gear reviews and a price watch. Astro 5 + MDX, static on Cloudflare Pages.
Rules: [CLAUDE.md](CLAUDE.md). Scope and order: [PLAN.md](PLAN.md).

## Setup

```bash
npm ci
npm run dev        # http://localhost:4321, drafts visible
```

## Publish loop

1. **Scaffold** a draft from the product registry:
   ```bash
   npm run new -- --type review --keyword "ninja af101 review"
   ```
   Types: `review`, `best`, `vs`, `smart-kitchen`, `recipe`, `guide`, `deals`.
   Options: `--product <id>`, `--appliance <slug>` (recipes), `--author <slug>`, `--slug <slug>`.
   The product has to be in `data/products.json` first.
2. **Draft** the body from the PLAN.md brief rules. Leave `draft: true`.
3. **A person** adds photos (`hero` + `hero_alt`), measured numbers, and the score. Only then set `draft: false`.
   The schema won't let a review go live without `tested_on`, the score fields and a hero photo.
4. **Link it from its hub** (`/best/{category}/`) and give it ≥3 internal links in the body.
5. **Check:**
   ```bash
   npm run build && npm run lint:content && npm run check:schema
   ```
   Lint and the schema check read `dist/`, so build first.
6. **Commit** as `content: {type} {slug}` and push to `main`. Cloudflare Workers Builds runs `npm run build` then `npx wrangler deploy` (static assets from `dist/`, see `wrangler.jsonc`).
7. **Once the deploy is live:**
   ```bash
   npm run ping:indexnow
   ```
   With no arguments, it pings the URLs of content published in the last commit. You can also pass paths: `npm run ping:indexnow -- /reviews/x/`.

## What the checks enforce

| Check | Fails on |
|---|---|
| `astro build` (zod, `src/content/config.ts`) | unknown frontmatter keys, title >60 / description >155, unknown author or product_id, live review missing test data |
| `lint:content` | raw affiliate/merchant URLs, images without alt, <3 internal links, review/guide with no table, recipe whose model has no live review, orphan pages, pages not linked from their hub, `TODO` left in any built page |
| `check:schema` | missing or invalid JSON-LD per page type (see CLAUDE.md "Schema") |
| Lighthouse CI (GitHub Actions) | mobile LCP ≥ 2.0 s, CLS ≥ 0.05, TBT ≥ 200 ms (the lab stand-in for INP) |

## Layout

- `src/content/<collection>/*.mdx`: pages. `src/content/authors/*.md`: authors (the file body is the bio).
- `src/layouts/`: `Base` (site JSON-LD), `Review`, `Guide` (guides, vs, smart-kitchen, best), `Recipe`, `Deals`.
- `src/components/`: `<AffiliateLink product_id merchant>` works in MDX without an import. It's the only way to link to a merchant.
- `data/products.json`: the product registry (schema: `data/products.schema.json`). `last_price_cents` belongs to `scripts/refresh-prices`, so don't edit it by hand.
- `public/_redirects`: add a 301 here if a published slug ever has to change.
- `public/<32-hex>.txt`: the IndexNow key file. Don't rename it.
