// Shared helpers for scripts/. Plain Node, no deps.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const CONTENT = join(ROOT, 'src/content');
export const DIST = join(ROOT, 'dist');
export const SITE = 'https://kitchenwatcher.com';
export const COLLECTIONS = ['reviews', 'best', 'vs', 'smart-kitchen', 'recipes', 'guides', 'deals'];

export const products = () => JSON.parse(readFileSync(join(ROOT, 'data/products.json'), 'utf8'));

export const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '');

// ponytail: reads top-level scalars and one-level lists only. Zod (astro sync) is the real validator;
// this just pulls the handful of keys the scripts need (draft, category, appliance, week, product_id, products).
export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { data[listKey].push(scalar(item[1])); continue; }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { data[k] = []; listKey = k; continue; }
    listKey = null;
    data[k] = v.startsWith('[') ? v.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== '') : scalar(v);
  }
  return { data, body: src.slice(m[0].length) };
}
const scalar = (v) => {
  v = v.trim().replace(/^(['"])(.*)\1$/, '$2');
  return v === 'true' ? true : v === 'false' ? false : v;
};

// Mirrors urlFor() in src/lib/site.ts.
export function urlFor(collection, id, data) {
  if (collection === 'best') return `/best/${data.category}/`;
  if (collection === 'recipes') return `/recipes/${data.appliance}/${id}/`;
  if (collection === 'deals') return `/deals/${data.week}/`;
  return `/${collection}/${id}/`;
}

// Every content entry: { collection, id, file, data, body, url }
export function entries() {
  const out = [];
  for (const collection of COLLECTIONS) {
    const dir = join(CONTENT, collection);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir, { recursive: true })) {
      if (!String(f).endsWith('.mdx')) continue;
      const file = join(dir, String(f));
      const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
      const id = String(f).replace(/\.mdx$/, '');
      out.push({ collection, id, file, data, body, url: urlFor(collection, id, data) });
    }
  }
  return out;
}

// All built HTML pages as { url, file }.
export function builtPages() {
  if (!existsSync(DIST)) return [];
  return readdirSync(DIST, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.html') && !f.startsWith('pagefind'))
    .map((f) => ({ file: join(DIST, f), url: '/' + f.replace(/index\.html$/, '').replace(/\.html$/, '/') }))
    .map((p) => ({ ...p, url: p.url.replace(/^\/\//, '/') }));
}
