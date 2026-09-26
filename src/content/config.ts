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
});

type Issue = { draft: boolean; hero?: unknown; hero_alt?: string };
// hero needs alt text; published pages must fill every field in `requiredLive`.
const gate =
  (requiredLive: string[]) =>
  (d: Issue & Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (d.hero && !d.hero_alt) ctx.addIssue({ code: 'custom', path: ['hero_alt'], message: 'hero needs hero_alt' });
    if (d.draft) return;
    for (const k of requiredLive) {
      if (d[k] === undefined) ctx.addIssue({ code: 'custom', path: [k], message: `${k} required before draft: false` });
    }
  };

const mdx = (dir: string) => glob({ pattern: '**/*.mdx', base: `./src/content/${dir}` });

// Review fields are optional while drafting; `gate` makes them mandatory to publish.
// No tested_on → stays draft (CLAUDE.md: never publish an untested product).
const reviewFields = {
  product_id: productId,
  score: z.number().min(1).max(10).optional(),
  pros: z.array(z.string().min(1)).optional(),
  cons: z.array(z.string().min(1)).optional(),
  tested_on: z.coerce.date().optional(),
  test_duration_days: z.number().int().positive().optional(),
  price_at_review_cents: z.number().int().positive().optional(),
  verdict: z.string().min(1).optional(),
};
const reviewLive = ['score', 'pros', 'cons', 'tested_on', 'test_duration_days', 'price_at_review_cents', 'verdict', 'hero'];

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
      .superRefine(gate([])),
});

const vs = defineCollection({
  loader: mdx('vs'),
  schema: (c) =>
    z
      .object({ ...base(c), products: z.tuple([productId, productId]) })
      .strict()
      .superRefine(gate([])),
});

// Explainers use the Guide layout; a smart-kitchen page about one device may name it.
const guideFields = {
  product_id: productId.optional(),
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) }).strict()).optional(),
};

const guides = defineCollection({
  loader: mdx('guides'),
  schema: (c) => z.object({ ...base(c), ...guideFields }).strict().superRefine(gate([])),
});

const smartKitchen = defineCollection({
  loader: mdx('smart-kitchen'),
  schema: (c) => z.object({ ...base(c), ...guideFields }).strict().superRefine(gate([])),
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
      .superRefine(gate(['prep_min', 'cook_min', 'servings', 'ingredients', 'steps', 'hero'])),
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
