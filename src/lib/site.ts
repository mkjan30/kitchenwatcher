import { getCollection, getEntry, type CollectionEntry, type CollectionKey } from 'astro:content';
import products from '../../data/products.json';

export const SITE = {
  name: 'Kitchen Watcher',
  url: 'https://kitchenwatcher.com',
  logo: '/logo.png', // TODO(human): placeholder "KW" mark; replace public/logo.png (512×512) and public/favicon.svg
  sameAs: [] as string[], // TODO(human): Pinterest, YouTube, Instagram, Reddit profile URLs
  amazonTag: 'kitchenwatcher-20', // TODO(human): confirm Associates tracking ID
  // Pre-launch switch: false puts <meta name="robots" content="noindex"> on every page.
  // Flip to true once the placeholder copy is gone, then submit the sitemap and run ping:indexnow.
  indexable: false,
};

export const DISCLOSURE =
  'Kitchen Watcher earns a commission when you buy through links on this page. It never changes our scores or rankings.';

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  asin: string | null;
  merchants: { id: string; url: string }[];
  last_price_cents: number | null;
  tested_on: string | null;
  price_seen_cents?: number | null;
  sources?: string[];
  complaints?: string[];
};

export const getProduct = (id: string): Product => {
  const p = (products as Product[]).find((x) => x.id === id);
  if (!p) throw new Error(`product ${id} not in data/products.json`);
  return p;
};

// Drafts render in `astro dev` only.
export const published = async <C extends CollectionKey>(c: C) =>
  (await getCollection(c, ({ data }) => import.meta.env.DEV || !(data as { draft: boolean }).draft)).sort((a, b) => a.id.localeCompare(b.id));

export const abs = (path: string) => new URL(path, SITE.url).href;
export const humanize = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const personLd = (a: CollectionEntry<'authors'>) => ({
  '@type': 'Person',
  '@id': abs(`/authors/${a.id}/#person`),
  name: a.data.name,
  jobTitle: a.data.job_title,
  url: abs(`/authors/${a.id}/`),
  ...(a.data.photo && { image: abs(a.data.photo.src) }),
  sameAs: a.data.same_as,
});

export const authorOf = async (ref: { id: string }) => {
  const a = await getEntry('authors', ref.id);
  if (!a) throw new Error(`author ${ref.id} missing from src/content/authors`);
  return a;
};

export const productLd = (p: Product) => ({
  '@type': 'Product',
  name: p.name,
  brand: { '@type': 'Brand', name: p.brand },
  ...(p.asin && { sku: p.asin }),
});

// Latest published review for a product, if any — used for "Made in", ProductCard, /best/ ranking.
export const reviewFor = async (productId: string) =>
  (await published('reviews')).find((r) => r.data.product_id === productId);

// Canonical URL per entry (CLAUDE.md "URL rules"). scripts/lint-content.mjs mirrors this.
export const urlFor = (e: CollectionEntry<Exclude<CollectionKey, 'authors'>>): string => {
  switch (e.collection) {
    case 'best': return `/best/${e.data.category}/`;
    case 'recipes': return `/recipes/${e.data.appliance}/${e.id}/`;
    case 'deals': return `/deals/${e.data.week}/`;
    default: return `/${e.collection}/${e.id}/`;
  }
};

export const hubCrumb = (productId: string) => {
  const c = getProduct(productId).category;
  return { name: `Best ${c.replace(/-/g, ' ')}`, path: `/best/${c}/` };
};

export const articleLd = (e: { data: { title: string; description: string; published: Date; updated: Date; hero?: { src: string } } }, author: CollectionEntry<'authors'>, path: string) => ({
  '@type': 'Article',
  headline: e.data.title,
  description: e.data.description,
  datePublished: iso(e.data.published),
  dateModified: iso(e.data.updated),
  mainEntityOfPage: abs(path),
  ...(e.data.hero && { image: abs(e.data.hero.src) }),
  author: personLd(author),
  publisher: { '@id': abs('/#org') },
});

// Display names for merchant ids in data/products.json. Unknown ids fall back to the humanized id.
const MERCHANTS: Record<string, string> = {
  amazon: 'Amazon',
  target: 'Target',
  bestbuy: 'Best Buy',
  walmart: 'Walmart',
  instant: 'Instant',
  cosori: 'COSORI',
  sharkninja: 'SharkNinja',
  stovetopfirestop: 'StoveTop FireStop',
  iguard: 'iGuard',
};
export const merchantName = (id: string) => MERCHANTS[id] ?? humanize(id);
