// Zod schemas for every collection. Strict: unknown keys fail. Enforce, never loosen.
import { defineCollection, reference, z, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import products from '../../data/products.json';

const productIds = new Set((products as { id: string }[]).map((p) => p.id));
const productId = z.string().refine((id) => productIds.has(id), (id) => ({
  message: `product_id "${id}" not in data/products.json`,
}));

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase-hyphen slug');

// Frontmatter every page must carry (CLAUDE.md "Content rules").
const base = ({ image }: SchemaContext) => ({
  title: z.string().max(60),
  description: z.string().max(155),
  author: reference('authors'),
  published: z.coerce.date(),
  updated: z.coerce.date(),
  primary_keyword: z.string().min(1),
  secondary_keywords: z.array(z.string().min(1)),
  draft: z.boolean(),
  hero: image().optional(),
  hero_alt: z.string().min(1).optional(),
  // Required with a hero: who owns the image (e.g. "Instant Brands"). Press-kit terms usually require attribution.
  hero_credit: z.string().min(1).optional(),
  // Open-licence images (CC BY / BY-SA): link the source page and the licence; hero_caption says what the photo shows
  // (e.g. that it's illustrative, not the reviewed model). Never crop or alter licensed images.
  hero_credit_url: z.string().url().optional(),
  hero_license: z.string().min(1).optional(),
  hero_license_url: z.string().url().optional(),
  hero_caption: z.string().min(1).optional(),
  // Reader questions, answered only from facts sourced on the page. Rendered as an FAQ section + FAQPage JSON-LD.
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) }).strict()).optional(),
  // Every URL actually read for this page. Required (≥2) before a page goes live.
  sources: z.array(z.string().url()).min(2).optional(),
  // Editor's brief: comparison-table columns, notes, and claims still to verify against sources.
  brief: z
    .object({
      table_columns: z.array(z.string().min(1)).min(1),
      notes: z.array(z.string().min(1)).optional(),
      verify: z.array(z.string().min(1)).optional(),
    })
    .strict()
    .optional(),
});

type Issue = { draft: boolean; hero?: unknown; hero_alt?: string };
// hero needs alt text; published pages must fill every field in `requiredLive`.
const gate =
  (requiredLive: string[]) =>
  (d: Issue & Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (d.hero && !d.hero_alt) ctx.addIssue({ code: 'custom', path: ['hero_alt'], message: 'hero needs hero_alt' });
    if (d.hero && !(d as { hero_credit?: string }).hero_credit) ctx.addIssue({ code: 'custom', path: ['hero_credit'], message: 'hero needs hero_credit (image owner)' });
    if (d.draft) return;
    for (const k of requiredLive) {
      if (d[k] === undefined) ctx.addIssue({ code: 'custom', path: [k], message: `${k} required before draft: false` });
    }
  };

const mdx = (dir: string) => glob({ pattern: '**/*.mdx', base: `./src/content/${dir}` });

// Research-based reviews (CLAUDE.md): no self-assigned score, no test dates. Fields are optional while
// drafting; `gate` makes them mandatory to publish, together with sources[].
const reviewFields = {
  product_id: productId,
  pros: z.array(z.string().min(1)).optional(),
  cons: z.array(z.string().min(1)).optional(),
  verdict: z.string().min(1).optional(),
};
// hero is optional: until a licensed image exists, the layout shows a line-art illustration (owner decision 2026-09-27).
const reviewLive = ['pros', 'cons', 'verdict', 'sources'];

const reviews = defineCollection({
  loader: mdx('reviews'),
  schema: (c) => z.object({ ...base(c), ...reviewFields }).strict().superRefine(gate(reviewLive)),
});

const best = defineCollection({
  loader: mdx('best'),
  schema: (c) =>
    z
      .object({ ...base(c), category: slug, products: z.array(productId).min(1) })
      .strict()
      .superRefine(gate(['sources'])),
});

const vs = defineCollection({
  loader: mdx('vs'),
  schema: (c) =>
    z
      .object({ ...base(c), products: z.tuple([productId, productId]) })
      .strict()
      .superRefine(gate(['sources'])),
});

// Explainers use the Guide layout; a smart-kitchen page about one device may name it.
const guideFields = {
  product_id: productId.optional(),
  // Hub this page belongs to when it isn't about one product (e.g. "air-fryers"); the hub lists it automatically.
  hub: slug.optional(),
};

const guides = defineCollection({
  loader: mdx('guides'),
  schema: (c) => z.object({ ...base(c), ...guideFields }).strict().superRefine(gate(['sources'])),
});

const smartKitchen = defineCollection({
  loader: mdx('smart-kitchen'),
  schema: (c) => z.object({ ...base(c), ...guideFields }).strict().superRefine(gate(['sources'])),
});

const recipes = defineCollection({
  loader: mdx('recipes'),
  schema: (c) =>
    z
      .object({
        ...base(c),
        appliance: slug,
        product_id: productId,
        prep_min: z.number().int().nonnegative().optional(),
        cook_min: z.number().int().positive().optional(),
        servings: z.number().int().positive().optional(),
        ingredients: z.array(z.string().min(1)).optional(),
        steps: z.array(z.string().min(1)).optional(),
        calories_kcal: z.number().positive().optional(),
        video_url: z.string().url().optional(),
      })
      .strict()
      .superRefine(gate(['prep_min', 'cook_min', 'servings', 'ingredients', 'steps', 'hero', 'sources'])),
});

const deals = defineCollection({
  loader: mdx('deals'),
  schema: (c) =>
    z
      .object({
        ...base(c),
        week: z.string().regex(/^\d{4}-\d{2}$/, 'yyyy-ww'),
        items: z.array(
          z
            .object({
              product_id: productId,
              merchant: z.string().min(1),
              price_cents: z.number().int().positive(),
              was_cents: z.number().int().positive().optional(),
              valid_until: z.coerce.date(),
            })
            .strict(),
        ),
      })
      .strict()
      .superRefine(gate([])),
});

// Body of the .md file is the bio.
const authors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        job_title: z.string().min(1),
        photo: image().optional(),
        photo_alt: z.string().min(1).optional(),
        same_as: z.array(z.string().url()),
      })
      .strict(),
});

export const collections = {
  reviews,
  best,
  vs,
  'smart-kitchen': smartKitchen,
  recipes,
  guides,
  deals,
  authors,
};
